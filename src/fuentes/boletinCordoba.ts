// Boletín Oficial de la Provincia de Córdoba, 1ª Sección (Legislación y
// Normativas). Ahí publica Rentas Córdoba lo de Ingresos Brutos.
//
// Cada día tiene su página (https://boletinoficial.cba.gov.ar/AAAA/MM/DD/,
// "no encontrado" si no hubo edición) con un PDF por sección:
// .../wp-content/.../AAAA/MM/1_Secc_DDMMAA.pdf
// El PDF empieza con un sumario (organismo, norma y página) que se usa para
// separarlo norma por norma.

import { extractText, getDocumentProxy } from 'unpdf';
import { normalizar } from '../texto.js';
import { pedir } from '../http.js';
import type { AvisoBO } from './boletinOficial.js';

const BASE = 'https://boletinoficial.cba.gov.ar';
export const NOMBRE_CORDOBA = 'Boletín Oficial de Córdoba';

interface Entrada {
  organismo: string;
  titulo: string;
  pagina: number;
}

// Encabezados y pies que se repiten en cada página del PDF.
const RUIDO = [
  /^LEGISLACI[ÓO]N Y NORMATIVAS/i,
  /^BOLET[IÍ]N OFICIAL DE LA PROVINCIA DE C[ÓO]RDOBA$/i,
  /^A[ÑN]O C[XLVI]+ - TOMO/i,
  /^C[ÓO]RDOBA, \(R\.A\.\)/i,
  /^\d{4} - A[ñn]o de/i,
  /^\d{1,3}$/,
  /^REDES DE$/,
  /^CONTACTO BOE$/,
  // Tapa: se repite en cada edición y en los suplementos.
  /^SUMARIO$/i,
  /^SECCI[ÓO]N$/i,
  /^LEGISLACI[ÓO]N Y$/i,
  /^NORMATIVAS$/i,
  /^\d+a\d+\s*BOLET[IÍ]N/i,
  /^(LUNES|MARTES|MI[EÉ]RCOLES|JUEVES|VIERNES|S[AÁ]BADO|DOMINGO) \d{1,2}/i,
  /^https?:\/\/boletinoficial\.cba\.gov\.ar/i,
];

const ENTRADA = /^(.*?)\s*\.{3,}\s*P[aá]g\.?\s*(\d+)\s*$/;
const esMayusculas = (s: string) => /\p{Lu}/u.test(s) && s === s.toLocaleUpperCase('es-AR');
const comparable = (s: string) => normalizar(s).replace(/\s+/g, ' ').trim();

/** Las líneas del sumario: organismo (puede ocupar varias líneas en mayúsculas) y cada norma con su página. */
export function parsearSumario(lineas: string[]): { entradas: Entrada[]; fin: number } {
  const entradas: Entrada[] = [];
  let organismo: string[] = [];
  let ultimaFueEntrada = true;
  let fin = 0;
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    const m = ENTRADA.exec(l);
    if (m) {
      entradas.push({ organismo: organismo.join(' '), titulo: m[1].trim(), pagina: Number(m[2]) });
      ultimaFueEntrada = true;
      fin = i + 1;
    } else if (esMayusculas(l)) {
      if (ultimaFueEntrada) organismo = [];
      organismo.push(l);
      ultimaFueEntrada = false;
    } else if (entradas.length) {
      break; // Empezó el cuerpo.
    }
  }
  return { entradas, fin };
}

/** Une los renglones partidos del PDF en párrafos. */
export function reflujo(lineas: string[]): string {
  let out = '';
  for (const l of lineas) {
    if (!out) out = l;
    else if (/\p{Ll}-$/u.test(out) && /^\p{Ll}/u.test(l)) out = out.slice(0, -1) + l;
    else if (/[.:;]$/.test(out)) out += '\n' + l;
    else out += ' ' + l;
  }
  return out;
}

/** Separa la 1ª Sección en normas. Lo que no se puede separar va entero, para no perderlo. */
export function parsearPrimeraSeccion(paginas: string[], pdf: string): AvisoBO[] {
  const lineas = paginas
    .join('\n')
    // A veces la línea del sumario queda pegada a lo que sigue: "…Pag. 1DIRECCIÓN GENERAL…".
    .replace(/(P[aá]g\.?\s*\d+)(?=\S)/g, '$1\n')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l && !RUIDO.some((r) => r.test(l)));
  // El sumario empieza después de la tapa, que termina con el mail del boletín
  // (los suplementos pueden no tenerlo: ahí se arranca desde el principio).
  const tapa = lineas.findIndex((l) => /^Email:/i.test(l));
  const { entradas, fin: finSumario } = parsearSumario(lineas.slice(tapa + 1));
  const fin = tapa + 1 + finSumario;
  if (!entradas.length) throw new Error('no se pudo leer el sumario de la 1ª Sección (¿cambió el formato del PDF?)');

  // Cada norma empieza donde aparece su título en el cuerpo, en el orden del sumario.
  const inicios: number[] = [];
  let desde = fin;
  for (const e of entradas) {
    const t = comparable(e.titulo);
    const k = lineas.findIndex((l, i) => i >= desde && comparable(l) === t);
    inicios.push(k);
    if (k !== -1) desde = k + 1;
  }

  const avisos: AvisoBO[] = [];
  const encontrados = entradas.map((e, i) => ({ e, inicio: inicios[i] })).filter((x) => x.inicio !== -1);
  encontrados.forEach(({ e, inicio }, j) => {
    const hasta = j + 1 < encontrados.length ? encontrados[j + 1].inicio : lineas.length;
    let cuerpo = lineas.slice(inicio + 1, hasta);
    // El organismo de la norma siguiente queda al final: se saca.
    const siguiente = encontrados[j + 1]?.e.organismo;
    while (siguiente && cuerpo.length && esMayusculas(cuerpo[cuerpo.length - 1]) && comparable(siguiente).includes(comparable(cuerpo[cuerpo.length - 1]))) {
      cuerpo = cuerpo.slice(0, -1);
    }
    const slug = comparable(e.titulo).replace(/[^a-z0-9]+/g, '-');
    avisos.push({ id: slug, url: `${pdf}#page=${e.pagina}&norma=${slug}`, organismo: e.organismo, titulo: e.titulo, texto: reflujo(cuerpo), boletin: NOMBRE_CORDOBA });
  });

  if (encontrados.length < entradas.length) {
    const faltan = entradas.filter((_, i) => inicios[i] === -1).map((e) => e.titulo);
    avisos.push({
      id: 'seccion-completa',
      url: `${pdf}#seccion-completa`,
      organismo: 'Varios organismos',
      titulo: `1ª Sección completa (no se pudo separar: ${faltan.join(', ')})`,
      texto: reflujo(lineas.slice(fin)),
      boletin: NOMBRE_CORDOBA,
    });
  }
  return avisos;
}

async function textoPdf(url: string): Promise<string[]> {
  const res = await pedir(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  const pdf = await getDocumentProxy(new Uint8Array(await res.arrayBuffer()));
  const { text } = await extractText(pdf, { mergePages: false });
  return text;
}

/** fecha AAAA-MM-DD. Devuelve [] si ese día no hubo edición o no tuvo 1ª Sección. */
export async function normasCordobaDelDia(fecha: string): Promise<AvisoBO[]> {
  const res = await pedir(`${BASE}/${fecha.replaceAll('-', '/')}/`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`HTTP ${res.status} al pedir la página del día`);
  const html = await res.text();
  const pdfs = [...new Set([...html.matchAll(/href="([^"]*\/1_Secc_[^"]*\.pdf)"/g)].map((m) => m[1]))];
  if (!pdfs.length) {
    // Hay días con otras secciones pero sin normas: eso es válido. Si no hay
    // ningún PDF, la página cambió.
    if (/_Secc_[^"]*\.pdf/.test(html)) return [];
    throw new Error('la página del día respondió, pero no tiene los PDF de las secciones (¿cambió el formato del sitio?)');
  }
  const avisos: AvisoBO[] = [];
  for (const pdf of pdfs) avisos.push(...parsearPrimeraSeccion(await textoPdf(pdf), pdf));
  return avisos;
}

