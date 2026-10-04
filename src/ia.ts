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

export interface ResumenIa {
  queCambia: string;
  comoAfecta: string;
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

const INSTRUCCIONES = `Sos analista de compliance en Argentina. Le explicás normas a una empresa: SYS Global Pay, billetera virtual para empresas, registrada en el BCRA como proveedor de servicios de pago que ofrece cuentas de pago (PSPCP). Sus clientes son empresas, que la usan para gastos corporativos con pagos QR y transferencias. Es sujeto obligado ante la UIF.

Reglas:
- Español claro y profesional, sin modismos ni tecnicismos innecesarios. Frases cortas.
- Usá solo lo que dice el material. No inventes plazos, montos ni obligaciones. Si algo no surge del texto, no lo afirmes.
- "queCambia": una o dos oraciones con lo que dispone la norma, en concreto.
- "comoAfecta": una o dos oraciones sobre si le aplica a SYS y qué tendría que hacer o revisar. Si no le aplica o no queda claro, decilo.`;

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
    if (!json.queCambia || !json.comoAfecta) return { ok: false, reintentable: true, error: 'respuesta incompleta' };
    return { ok: true, r: { queCambia: json.queCambia.trim(), comoAfecta: json.comoAfecta.trim(), modelo } };
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
        properties: { queCambia: { type: 'STRING' }, comoAfecta: { type: 'STRING' } },
        required: ['queCambia', 'comoAfecta'],
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
      hechos++;
    }
  }
  const faltan = hallazgos.length - hechos;
  return faltan
    ? `Resumen con IA: ${hechos} de ${hallazgos.length} normas. ${faltan} quedaron sin resumen (${error}); tienen igual la explicación por reglas.`
    : `Resumen con IA: ${hechos} de ${hallazgos.length} normas.`;
}
