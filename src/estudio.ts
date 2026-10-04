// Estudio para afinar las palabras clave con datos reales. Deja el resultado
// en docs/estudio-palabras.md.
//
//   npm run estudio
//
// 1. Comunicaciones del BCRA dirigidas a los PSP (ejemplos seguros de "le
//    importa a SYS"): ¿el filtro por palabras las detectaría solo, sin el
//    atajo de "dirigida a los PSP"? Las que no, muestran palabras que faltan.
//    Además, qué frases aparecen mucho en ellas y poco en el resto.
// 2. Boletín Oficial de varios meses: las normas que el filtro descartó pero
//    que son de un organismo que importa y hablan de pagos, transferencias,
//    tarjetas o recaudación ("casi"). La IA dice si aplicaban: cada "aplica"
//    es un hueco del filtro.
//
// Pide los datos con pausa y usa la IA dentro del cupo gratuito. No toca
// datos/ ni la página.

import { writeFile } from 'node:fs/promises';
import { avisosDelDia, type AvisoBO } from './fuentes/boletinOficial.js';
import { leerComunicacion, type ComunicacionBCRA } from './fuentes/bcraComunicaciones.js';
import { cartaBcra, explicarAvisoBO } from './explicar.js';
import { resumirTodos } from './ia.js';
import { diasEntre, Lote } from './procesar.js';
import { dirigidaAPsp, evaluar } from './reglas.js';
import { normalizar } from './texto.js';

const BCRA_DESDE = 8000;
const BCRA_HASTA = 8488;
const BO_DESDE = '2026-07-01';
const BO_HASTA = '2026-09-30';
const MAX_CASI = 250;

// Organismos cuyas normas pueden tocar a una billetera.
const ORG_RELEVANTE = /banco central|recaudacion y control aduanero|informacion financiera|comision nacional de valores|comision arbitral|ministerio de economia|comercio|defensa del consumidor|poder ejecutivo|presidencia|jefatura de gabinete/;
// Señales flojas de que habla de medios de pago.
const SENAL_PAGOS = /\bpagos?\b|billeter|transferencia|tarjeta|\bqr\b|fintech|cobranza|recaudaci|acreditaci|monedero|dinero electronico|medios? de pago|plataformas? (digital|electronica)/;

const fila = (c: string[]) => `| ${c.map((x) => x.replace(/\|/g, '/').replace(/\s+/g, ' ')).join(' | ')} |`;
const md: string[] = [];
const hoy = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'long' }).format(new Date());
md.push('# Estudio de palabras clave', '', `Corrido el ${hoy} con \`npm run estudio\`. Fuentes oficiales; la IA solo opina sobre normas reales.`, '');

// ---------------------------------------------------------------------------
// 1. BCRA

console.log(`1. Comunicaciones A ${BCRA_DESDE} a A ${BCRA_HASTA}…`);
const positivas: ComunicacionBCRA[] = [];
const negativas: ComunicacionBCRA[] = [];
for (let n = BCRA_DESDE; n <= BCRA_HASTA; n++) {
  const c = await leerComunicacion('A', n);
  if (!c) continue;
  (dirigidaAPsp(c.destinatarios) ? positivas : negativas).push(c);
  if (n % 50 === 0) console.log(`   A ${n}…`);
}

// ¿Las detectaría el filtro por palabras sin el atajo "dirigida a los PSP"?
// Se evalúan como llegarían por el Boletín Oficial: encabezado y carta, con el
// BCRA como organismo.
const sinAtajo = positivas.map((c) => ({ c, ev: evaluar('BANCO CENTRAL DE LA REPÚBLICA ARGENTINA', `${c.destinatarios}
${c.referencia}
${cartaBcra(c.texto) || c.texto}`) }));
const escapan = sinAtajo.filter((x) => x.ev.nivel === 'descartada');
md.push(
  `## 1. Comunicaciones del BCRA dirigidas a los PSP (A ${BCRA_DESDE} a A ${BCRA_HASTA})`,
  '',
  `- Leídas: ${positivas.length + negativas.length}. Dirigidas a los PSP: **${positivas.length}**.`,
  `- Con el filtro por palabras solo (sin el atajo "dirigida a los PSP"): ${sinAtajo.filter((x) => x.ev.nivel === 'alta').length} "Le afecta", ${sinAtajo.filter((x) => x.ev.nivel === 'revisar').length} "Para revisar", **${escapan.length} se escaparían**.`,
  '',
  'En la corrida diaria estas comunicaciones nunca se escapan (el atajo las marca siempre). Esta prueba mide si las palabras clave las detectarían igual si llegaran por el Boletín Oficial (encabezado y carta, sin el atajo).',
  '',
);
if (escapan.length) {
  md.push('Las que el filtro solo no detectaría:', '', fila(['Comunicación', 'Tema']), fila(['---', '---']), ...escapan.map((x) => fila([`A ${x.c.numero} (${x.c.fecha})`, x.c.referencia])), '');
}

// ---------------------------------------------------------------------------
// 2. Boletín Oficial

console.log(`2. Boletín Oficial del ${BO_DESDE} al ${BO_HASTA}…`);
let ediciones = 0;
let normas = 0;
const pasan = new Lote();
const casi: { aviso: AvisoBO; dia: string }[] = [];
for (const dia of [BO_DESDE, ...diasEntre(BO_DESDE, BO_HASTA)]) {
  let avisos: AvisoBO[];
  try {
    avisos = await avisosDelDia(dia.replaceAll('-', ''));
  } catch (e) {
    md.push(`- ⚠ Boletín del ${dia}: ${(e as Error).message}`);
    continue;
  }
  if (!avisos.length) continue;
  ediciones++;
  normas += avisos.length;
  pasan.avisosBO(avisos, dia);
  for (const a of avisos) {
    const ev = evaluar(a.organismo, `${a.titulo}\n${a.texto}`);
    if (ev.nivel !== 'descartada') continue;
    if (ORG_RELEVANTE.test(normalizar(a.organismo)) && SENAL_PAGOS.test(normalizar(a.texto))) casi.push({ aviso: a, dia });
  }
  console.log(`   ${dia}: ${avisos.length} normas, pasan ${pasan.hallazgos.length}, casi ${casi.length}`);
}

// La IA opina sobre las "casi": se arman como hallazgos "para revisar" para usar el mismo camino.
const loteCasi = new Lote();
for (const { aviso, dia } of casi.slice(0, MAX_CASI)) {
  const ev = { ...evaluar(aviso.organismo, `${aviso.titulo}\n${aviso.texto}`), nivel: 'revisar' as const };
  loteCasi.agregar(explicarAvisoBO(aviso, ev, dia), aviso.texto);
}
console.log(`   IA sobre ${loteCasi.hallazgos.length} normas "casi" y ${pasan.hallazgos.length} que pasan…`);
const iaCasi = await resumirTodos(loteCasi.hallazgos, loteCasi.textos);
const iaPasan = await resumirTodos(pasan.hallazgos, pasan.textos);
const huecos = loteCasi.hallazgos.filter((h) => h.resumenIa && h.resumenIa.veredicto !== 'no_aplica');
const nivel = (n: string) => pasan.hallazgos.filter((h) => h.evaluacion.nivel === n).length;

md.push(
  `## 2. Boletín Oficial del ${BO_DESDE} al ${BO_HASTA}`,
  '',
  `- ${ediciones} ediciones, **${normas} normas** leídas.`,
  `- Pasan el filtro: ${pasan.hallazgos.length}. Después de la IA se muestran **${nivel('alta')} "Le afecta"** y **${nivel('revisar')} "Para revisar"**; ${nivel('descartada')} quedan plegadas. ${iaPasan}`,
  `- "Casi" (descartadas por el filtro, de un organismo que importa y que hablan de pagos): ${casi.length}${casi.length > MAX_CASI ? ` (la IA vio las primeras ${MAX_CASI})` : ''}. ${iaCasi}`,
  `- **Huecos del filtro** (la IA dice que aplicaban o podían aplicar): **${huecos.length}**.`,
  '',
);
if (huecos.length) {
  md.push(fila(['Fecha', 'Norma', 'Veredicto', 'Qué cambia (IA)', 'Cómo le afecta (IA)']), fila(['---', '---', '---', '---', '---']), ...huecos.map((h) => fila([h.fecha, `${h.titulo} — ${h.emisor}`, h.resumenIa!.veredicto ?? '', h.resumenIa!.queCambia, h.resumenIa!.comoAfecta])), '');
}
md.push(
  '### Lo que se mostró en esos meses',
  '',
  fila(['Fecha', 'Norma', 'Resultado', 'Qué hacer (IA)']),
  fila(['---', '---', '---', '---']),
  ...pasan.hallazgos.filter((h) => h.evaluacion.nivel !== 'descartada').map((h) => fila([h.fecha, `${h.titulo} — ${h.emisor}`, h.evaluacion.nivel === 'alta' ? 'Le afecta' : 'Para revisar', h.resumenIa?.queHacer ?? h.resumenIa?.comoAfecta ?? '—'])),
  '',
);

await writeFile(new URL('../docs/estudio-palabras.md', import.meta.url), md.join('\n'), 'utf8');
console.log(md.join('\n'));
