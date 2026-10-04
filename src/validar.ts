// Prueba el monitor contra casos reales y deja el resultado en docs/validacion.md.
//
//   npm run validar
//
// 1. Casos conocidos: normas reales que afectaron a billeteras y PSP. Tienen
//    que aparecer (como "Le afecta" o "Para revisar").
// 2. Comunicaciones del BCRA: se leen todas en un rango; el encabezado se
//    tiene que poder leer siempre, y las dirigidas a los PSP tienen que salir
//    como "Le afecta".
// 3. Ruido: un rango de días hábiles del Boletín Oficial; cuánto se muestra.
//
// Usa la IA si hay clave (como la corrida diaria). No toca datos/ ni la página.

import { writeFile } from 'node:fs/promises';
import { avisosDelDia } from './fuentes/boletinOficial.js';
import { leerComunicacion } from './fuentes/bcraComunicaciones.js';
import type { Hallazgo } from './explicar.js';
import { resumirTodos } from './ia.js';
import { diasEntre, Lote } from './procesar.js';

interface Caso {
  fecha: string;
  /** Número de aviso en el Boletín Oficial (sale del link). */
  id: string;
  norma: string;
  porQue: string;
  /** "mostrar": tiene que aparecer. "informativo": se informa cómo salió, sin exigir nada. */
  esperado: 'mostrar' | 'informativo';
}

// Cada caso tiene su link verificado en el Boletín Oficial.
const CASOS: Caso[] = [
  { fecha: '2024-12-19', id: '318446', norma: 'Res. UIF 200/2024', porQue: 'Obligaciones antilavado de los PSP', esperado: 'mostrar' },
  { fecha: '2025-03-13', id: '322461', norma: 'Com. BCRA A 8206', porQue: 'Pagos QR en transporte para PSPCP', esperado: 'mostrar' },
  { fecha: '2025-03-14', id: '322539', norma: 'RG CNV 1058/2025', porQue: 'Registro de proveedores de activos virtuales (PSAV), no PSP', esperado: 'informativo' },
  { fecha: '2025-05-23', id: '325806', norma: 'RG ARCA 5699/2025', porQue: 'Montos que informan las billeteras', esperado: 'mostrar' },
  { fecha: '2025-06-05', id: '326520', norma: 'Res. UIF 78/2025', porQue: 'Cambios a las normas de la UIF', esperado: 'mostrar' },
  { fecha: '2025-11-14', id: '334537', norma: 'Disp. Comisión Arbitral 13/2025', porQue: 'Prórroga de vencimientos de SIRCUPA', esperado: 'mostrar' },
  { fecha: '2025-12-12', id: '336077', norma: 'RG Comisión Arbitral 23/2025', porQue: 'Vencimientos 2026 de SIRCUPA', esperado: 'mostrar' },
  { fecha: '2025-12-24', id: '336723', norma: 'RG ARCA 5804/2025', porQue: 'Régimen de información de los PSP', esperado: 'mostrar' },
  { fecha: '2026-02-09', id: '338304', norma: 'Com. BCRA A 8398', porQue: 'Seguridad informática alcanza a los PSP', esperado: 'mostrar' },
  { fecha: '2026-06-18', id: '343279', norma: 'Decreto 475/2026', porQue: 'Impuesto al cheque: exenciones PSP', esperado: 'mostrar' },
];

const BCRA_DESDE = 8300;
const BCRA_HASTA = 8488;
const RUIDO_DESDE = '2026-08-24';
const RUIDO_HASTA = '2026-09-18';

const NOMBRE = { alta: 'Le afecta', revisar: 'Para revisar', descartada: 'Descartada' } as const;
const nivelDe = (h?: Hallazgo) => (h ? NOMBRE[h.evaluacion.nivel] : 'No pasó el filtro');
const fila = (celdas: string[]) => `| ${celdas.map((c) => c.replace(/\|/g, '/').replace(/\s+/g, ' ')).join(' | ')} |`;

const md: string[] = [];
const hoy = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'long' }).format(new Date());
md.push('# Validación del monitor', '', `Corrida el ${hoy} con \`npm run validar\`. Todo sale de fuentes oficiales; nada está armado a mano.`, '');

// ---------------------------------------------------------------------------
// 1. Casos conocidos

console.log('1. Casos conocidos…');
const lote1 = new Lote();
const porCaso = new Map<Caso, Hallazgo | undefined>();
const sinAviso: Caso[] = [];
for (const c of CASOS) {
  const avisos = await avisosDelDia(c.fecha.replaceAll('-', ''));
  const aviso = avisos.find((a) => a.url.includes(`/${c.id}/`));
  if (!aviso) {
    sinAviso.push(c);
    continue;
  }
  const antes = lote1.hallazgos.length;
  lote1.avisosBO([aviso], c.fecha);
  porCaso.set(c, lote1.hallazgos[antes]);
}
const ia1 = await resumirTodos(lote1.hallazgos, lote1.textos);
const exigidos = CASOS.filter((c) => c.esperado === 'mostrar');
const encontrados = exigidos.filter((c) => ['alta', 'revisar'].includes(porCaso.get(c)?.evaluacion.nivel ?? ''));
md.push(
  '## 1. Casos reales que tienen que aparecer',
  '',
  `**${encontrados.length} de ${exigidos.length}** aparecen en la página. ${ia1}`,
  '',
  fila(['Norma', 'Boletín', 'Por qué importa', 'Resultado', 'Veredicto IA', 'Qué hacer (IA)']),
  fila(['---', '---', '---', '---', '---', '---']),
  ...CASOS.map((c) => {
    const h = porCaso.get(c);
    const ok = c.esperado === 'informativo' ? 'ℹ️' : ['alta', 'revisar'].includes(h?.evaluacion.nivel ?? '') ? '✅' : '❌';
    return fila([c.norma, c.fecha, c.porQue, `${ok} ${sinAviso.includes(c) ? 'Aviso no encontrado' : nivelDe(h)}`, h?.resumenIa?.veredicto ?? '—', h?.resumenIa?.queHacer ?? '—']);
  }),
  '',
);

// ---------------------------------------------------------------------------
// 2. Comunicaciones del BCRA

console.log(`2. Comunicaciones A ${BCRA_DESDE} a A ${BCRA_HASTA}…`);
let leidas = 0;
let faltantes = 0;
const malLeidas: string[] = [];
const dirigidas: { numero: number; referencia: string; nivel: string }[] = [];
const lote2 = new Lote();
for (let n = BCRA_DESDE; n <= BCRA_HASTA; n++) {
  const c = await leerComunicacion('A', n);
  if (!c) {
    faltantes++;
    continue;
  }
  leidas++;
  if (!c.fecha || !c.destinatarios || !c.referencia) malLeidas.push(`A ${n} (${[!c.fecha && 'fecha', !c.destinatarios && 'destinatarios', !c.referencia && 'referencia'].filter(Boolean).join(', ')})`);
  const antes = lote2.hallazgos.length;
  lote2.comunicacion(c);
  const h = lote2.hallazgos[antes];
  if (h?.evaluacion.motivos.includes('dirigida a los proveedores de servicios de pago')) dirigidas.push({ numero: n, referencia: h.asunto, nivel: nivelDe(h) });
}
const dirigidasOk = dirigidas.filter((d) => d.nivel === NOMBRE.alta).length;
md.push(
  `## 2. Comunicaciones "A" del BCRA (A ${BCRA_DESDE} a A ${BCRA_HASTA})`,
  '',
  `- Leídas: **${leidas}** (${faltantes} números sin publicar).`,
  `- Encabezado ilegible (fecha, destinatarios o referencia): **${malLeidas.length}**${malLeidas.length ? `: ${malLeidas.join('; ')}` : ''}.`,
  `- Dirigidas a los PSP: **${dirigidas.length}**, de las cuales **${dirigidasOk}** salen como "Le afecta".`,
  `- Otras que pasan el primer filtro (sin IA): ${lote2.hallazgos.length - dirigidas.length}.`,
  '',
  fila(['Comunicación', 'Tema', 'Resultado']),
  fila(['---', '---', '---']),
  ...dirigidas.map((d) => fila([`A ${d.numero}`, d.referencia, d.nivel])),
  '',
);

// ---------------------------------------------------------------------------
// 3. Ruido

console.log(`3. Boletín Oficial del ${RUIDO_DESDE} al ${RUIDO_HASTA}…`);
const lote3 = new Lote();
let dias = 0;
let avisos = 0;
for (const dia of [RUIDO_DESDE, ...diasEntre(RUIDO_DESDE, RUIDO_HASTA)]) {
  const a = await avisosDelDia(dia.replaceAll('-', ''));
  if (!a.length) continue;
  dias++;
  avisos += a.length;
  lote3.avisosBO(a, dia);
}
const ia3 = await resumirTodos(lote3.hallazgos, lote3.textos);
const cuenta = (nivel: string) => lote3.hallazgos.filter((h) => h.evaluacion.nivel === nivel);
md.push(
  `## 3. Ruido: Boletín Oficial del ${RUIDO_DESDE} al ${RUIDO_HASTA}`,
  '',
  `- ${dias} ediciones, **${avisos} normas** leídas. Pasan el primer filtro: ${lote3.hallazgos.length}. ${ia3}`,
  `- Se muestran: **${cuenta('alta').length} "Le afecta"** y **${cuenta('revisar').length} "Para revisar"**. Plegadas (la IA no ve impacto): ${cuenta('descartada').length}.`,
  '',
  fila(['Fecha', 'Norma', 'Resultado', 'Veredicto IA', 'Qué cambia (IA)']),
  fila(['---', '---', '---', '---', '---']),
  ...lote3.hallazgos.map((h) => fila([h.fecha, `${h.titulo} — ${h.emisor}`, nivelDe(h), h.resumenIa?.veredicto ?? '—', h.resumenIa?.queCambia ?? '—'])),
  '',
);

await writeFile(new URL('../docs/validacion.md', import.meta.url), md.join('\n'), 'utf8');
console.log(md.join('\n'));
