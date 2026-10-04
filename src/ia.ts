// Resumen opcional con IA (Gemini, nivel gratuito de Google AI Studio).
//
// Reglas de uso (ver CLAUDE.md):
// - La IA no decide qué norma aparece: solo resume las que ya pasaron el filtro.
// - Solo se le manda texto público de la norma. Nunca datos de SYS: en el nivel
//   gratuito, Google puede usar lo que recibe para mejorar sus productos.
// - Si no hay clave o Gemini no responde, el informe sale igual, sin resumen.
//
// La clave va en .env (GEMINI_API_KEY=...), que no se sube nunca.

import type { Hallazgo } from './explicar.js';
import { TEMAS } from './temas.js';

export type Veredicto = 'aplica' | 'dudoso' | 'no_aplica';

export interface ResumenIa {
  /** Si la norma le cambia algo a SYS como billetera. Las viejas no lo tienen. */
  veredicto?: Veredicto;
  queCambia: string;
  comoAfecta: string;
  /** Qué tiene que hacer SYS y desde cuándo (solo si aplica o es dudoso). */
  queHacer?: string;
  modelo: string;
}

// En orden de preferencia. Si uno está saturado o sin cupo, se prueba el siguiente.
// Cupos del nivel gratuito vistos en AI Studio el 3/10/2026 (pedidos por minuto /
// por día): 3.5 Flash-Lite 15/500, 3.1 Flash-Lite 15/500, 2.5 Flash-Lite 10/20.
// Usamos unos 30 por día en el peor caso.
const MODELOS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'];
// Un pedido cada 6 s: 10 por minuto, abajo del tope más bajo del nivel gratuito (15).
const PAUSA_MS = 6_000;
// Lo que se le manda de la norma. Alcanza para la carta y el comienzo del anexo.
const MAX_TEXTO = 15_000;

const VEREDICTOS: Veredicto[] = ['aplica', 'dudoso', 'no_aplica'];

/**
 * El nivel final combina las reglas con el veredicto de la IA:
 * - Dirigida a los PSP por el BCRA: le afecta, diga lo que diga la IA.
 * - La IA dice que aplica: le afecta.
 * - La IA dice que es dudoso: para revisar.
 * - La IA dice que no aplica: si la norma nombra la actividad de SYS, queda
 *   para revisar (la IA nunca puede esconder eso); si no, se descarta y queda
 *   plegada al final de la página, con el motivo, sin aviso por mail.
 * Sin veredicto (IA caída o desactivada) manda lo que dijeron las reglas.
 */
export function nivelFinal(h: Pick<Hallazgo, 'evaluacion'>, veredicto?: Veredicto): Hallazgo['evaluacion']['nivel'] {
  const nivel = h.evaluacion.nivel;
  if (!veredicto || h.evaluacion.motivos.includes('dirigida a los proveedores de servicios de pago')) return nivel;
  if (nivel === 'descartada') return nivel;
  if (veredicto === 'aplica') return 'alta';
  if (veredicto === 'dudoso') return 'revisar';
  return h.evaluacion.fuerte ? 'revisar' : 'descartada';
}

const URL_API = (modelo: string) => `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function claveIa(): string | undefined {
  try {
    process.loadEnvFile();
  } catch {
    // Sin .env: puede venir del entorno (p. ej. un secreto del servidor) o no estar.
  }
  return process.env.GEMINI_API_KEY || undefined;
}

const INSTRUCCIONES = `Sos analista de compliance en Argentina. Tu trabajo es decirle al equipo de compliance de SYS si una norma le cambia algo y qué tiene que hacer.

SYS: billetera virtual para empresas (gastos corporativos con pagos QR y transferencias), registrada en el BCRA como proveedor de servicios de pago que ofrece cuentas de pago (PSPCP). Sus clientes son empresas. Su base está en Córdoba. Es sujeto obligado ante la UIF. Como PSPCP es agente de recaudación de Ingresos Brutos (SIRCUPA) e informa a ARCA los movimientos de sus clientes.

Alcance: solo cuenta lo que afecta el negocio de SYS como billetera: su registro y obligaciones como PSP, la operatoria de pagos y transferencias, los fondos y la información a clientes, los reportes al BCRA, a la UIF y a ARCA, los impuestos que la billetera retiene, percibe o informa, la seguridad informática y la prevención del fraude y del lavado, y los feriados bancarios (cambian cuándo se acreditan las transferencias con los bancos). Las obligaciones que tiene cualquier empresa (sueldos, aportes, cargas sociales, sus propios impuestos) NO cuentan: eso lo lleva su contador.

Respondé:
- "veredicto": "aplica" si la norma le cambia algo a SYS dentro de ese alcance; "no_aplica" si no; "dudoso" solo si depende de algo que no se sabe (por ejemplo, si SYS opera en el exterior o emite tarjetas).
- "queCambia": una oración concreta con lo que dispone la norma (quién, qué, desde cuándo si lo dice).
- "comoAfecta": si aplica, una oración con qué le cambia a SYS en concreto; si no aplica, el motivo en menos de 15 palabras.
- "queHacer": si aplica o es dudoso, la acción concreta y el plazo si la norma lo da (ej.: "Usar el padrón de octubre para las retenciones desde el 1/10."). Nada de "revisar", "verificar" ni "analizar el impacto". Si no aplica, vacío.
- Si la norma solo actualiza un texto ordenado o reemplaza hojas, no trae reglas nuevas: decí qué comunicación trae el cambio de fondo y que esa es la que hay que leer.

Reglas: español claro y profesional, frases cortas, sin modismos. Decí siempre "SYS", nunca "nosotros". Usá solo lo que dice el material: no inventes plazos, montos ni obligaciones. Una fecha de vigencia solo si está escrita en el texto de la norma; las fechas de las normas citadas no son vigencias.`;

function material(h: Hallazgo, texto: string): string {
  return [
    `Norma: ${h.titulo}${h.asunto ? ` — ${h.asunto}` : ''}`,
    `Emisor: ${h.emisor}. Fecha: ${h.fecha}. Tipo: ${h.tipo}. Tema para SYS: ${TEMAS[h.tema].nombre}.`,
    `Análisis automático previo: ${h.comoAfecta[0]}`,
    h.fechasClave.length ? `Fechas detectadas: ${h.fechasClave.join(' | ')}` : '',
    h.relacionadas.some((e) => e.detalle) ? `Normas citadas: ${h.relacionadas.filter((e) => e.detalle).map((e) => `${e.texto}: ${e.detalle}`).join(' | ')}` : '',
    '',
    'Texto de la norma:',
    (texto || h.queCambia).replace(/\s+/g, ' ').slice(0, MAX_TEXTO),
  ]
    .filter((x) => x !== '')
    .join('\n');
}

async function pedir(modelo: string, clave: string, cuerpo: unknown): Promise<{ ok: true; r: ResumenIa } | { ok: false; reintentable: boolean; error: string }> {
  try {
    const res = await fetch(URL_API(modelo), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(60_000),
    });
    const datos = (await res.json()) as {
      error?: { message?: string };
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    if (!res.ok) {
      // 429 = sin cupo por ahora; 5xx = saturado. Vale probar de nuevo u otro modelo.
      return { ok: false, reintentable: res.status === 429 || res.status >= 500, error: `HTTP ${res.status}: ${datos.error?.message ?? ''}`.slice(0, 200) };
    }
    const json = JSON.parse(datos.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}') as Partial<ResumenIa>;
    if (!json.queCambia || !json.comoAfecta || !VEREDICTOS.includes(json.veredicto as Veredicto)) return { ok: false, reintentable: true, error: 'respuesta incompleta' };
    return {
      ok: true,
      r: { veredicto: json.veredicto, queCambia: json.queCambia.trim(), comoAfecta: json.comoAfecta.trim(), queHacer: json.queHacer?.trim() || undefined, modelo },
    };
  } catch (e) {
    return { ok: false, reintentable: true, error: (e as Error).message };
  }
}

/** Devuelve el resumen, o el motivo por el que no se pudo. Nunca tira error. */
export async function resumirConIa(h: Hallazgo, texto: string, clave: string): Promise<ResumenIa | string> {
  const cuerpo = {
    systemInstruction: { parts: [{ text: INSTRUCCIONES }] },
    contents: [{ role: 'user', parts: [{ text: material(h, texto) }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          veredicto: { type: 'STRING', enum: VEREDICTOS },
          queCambia: { type: 'STRING' },
          comoAfecta: { type: 'STRING' },
          queHacer: { type: 'STRING' },
        },
        required: ['veredicto', 'queCambia', 'comoAfecta', 'queHacer'],
        propertyOrdering: ['veredicto', 'queCambia', 'comoAfecta', 'queHacer'],
      },
    },
  };
  let ultimo = '';
  for (const modelo of MODELOS) {
    for (let intento = 0; intento < 2; intento++) {
      const r = await pedir(modelo, clave, cuerpo);
      if (r.ok) return r.r;
      ultimo = `${modelo}: ${r.error}`;
      if (!r.reintentable) return ultimo; // p. ej. clave inválida: no tiene sentido insistir
      await esperar(PAUSA_MS * (intento + 1));
    }
  }
  return ultimo;
}

/**
 * Resume cada hallazgo de a uno, con pausa entre pedidos. Devuelve una línea
 * para "Qué se revisó".
 */
export async function resumirTodos(hallazgos: Hallazgo[], textos: Map<Hallazgo, string>): Promise<string> {
  const clave = claveIa();
  if (!clave) return 'Resumen con IA: desactivado (no hay clave GEMINI_API_KEY).';
  if (!hallazgos.length) return 'Resumen con IA: no hubo normas para resumir.';
  let hechos = 0;
  let error = '';
  for (const [i, h] of hallazgos.entries()) {
    if (i > 0) await esperar(PAUSA_MS);
    const r = await resumirConIa(h, textos.get(h) ?? '', clave);
    if (typeof r === 'string') error = r;
    else {
      h.resumenIa = r;
      const antes = h.evaluacion.nivel;
      h.evaluacion.nivel = nivelFinal(h, r.veredicto);
      if (h.evaluacion.nivel !== antes) h.evaluacion.motivos.push(`la IA ${r.veredicto === 'aplica' ? 'confirma que aplica' : 'no ve impacto para SYS'}`);
      hechos++;
    }
  }
  const faltan = hallazgos.length - hechos;
  return faltan
    ? `Resumen con IA: ${hechos} de ${hallazgos.length} normas. ${faltan} quedaron sin resumen (${error}); tienen igual la explicación por reglas.`
    : `Resumen con IA: ${hechos} de ${hallazgos.length} normas.`;
}
