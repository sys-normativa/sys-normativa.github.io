// Rentas Córdoba: la normativa impositiva de la provincia (Ingresos Brutos,
// agentes de retención y percepción, padrones, SIRCUPA), tal como la publica
// Rentas en su sitio, con un resumen propio de cada norma.
//
// Se usa en lugar del Boletín Oficial de Córdoba porque ese sitio bloquea las
// conexiones de fuera del país (el monitor corre en servidores de EE.UU.).
// Feed RSS: https://www.rentascordoba.gob.ar/cms/feed/ (10 por página, ?paged=N).

import { pedir } from '../http.js';
import { decodificarEntidades, htmlATexto } from '../texto.js';

const FEED = 'https://www.rentascordoba.gob.ar/cms/feed/';

export interface NormaRentas {
  /** Identificador del sitio ("p=101422"). */
  id: string;
  url: string;
  titulo: string;
  /** AAAA-MM-DD, en hora argentina. */
  fecha: string;
  categorias: string[];
  /** El resumen que escribe Rentas. */
  resumen: string;
  texto: string;
}

// Entradas del sitio que no son normas.
const NO_NORMAS = /gestiones cms|gu[ií]a tr[aá]mite/i;

const cdata = (s: string) => s.replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1');
const etiqueta = (item: string, nombre: string) => cdata(new RegExp(`<${nombre}[^>]*>([\\s\\S]*?)</${nombre}>`).exec(item)?.[1]?.trim() ?? '');

/** "Tue, 22 Sep 2026 11:10:28 +0000" -> "2026-09-22" (hora argentina). */
export function fechaArgentina(pubDate: string): string {
  const d = new Date(pubDate);
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(d);
}

export function parsearFeed(xml: string): NormaRentas[] {
  const out: NormaRentas[] = [];
  for (const [, item] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const categorias = [...item.matchAll(/<category>([\s\S]*?)<\/category>/g)].map((m) => cdata(m[1].trim()));
    if (categorias.some((c) => NO_NORMAS.test(c))) continue;
    const resumen = htmlATexto(etiqueta(item, 'description'))
      // Pie que agrega WordPress a cada entrada.
      .replace(/\s*La entrada [\s\S]*? se publicó primero en [\s\S]*$/, '')
      .trim();
    out.push({
      id: /[?&](p=\d+)/.exec(etiqueta(item, 'guid'))?.[1] ?? etiqueta(item, 'link'),
      url: etiqueta(item, 'link'),
      titulo: decodificarEntidades(etiqueta(item, 'title')),
      fecha: fechaArgentina(etiqueta(item, 'pubDate')),
      categorias,
      resumen,
      texto: htmlATexto(etiqueta(item, 'content:encoded')).replace(/^Tiempo de lectura:[^\n]*\n?/i, ''),
    });
  }
  return out;
}

/** Una página del feed (1 = la más nueva). */
export async function listarRentas(pagina = 1): Promise<NormaRentas[]> {
  const res = await pedir(pagina === 1 ? FEED : `${FEED}?paged=${pagina}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} al pedir el feed`);
  const xml = await res.text();
  // El feed siempre trae entradas: si no se reconoce ninguna, cambió el formato.
  if (!/<item>/.test(xml)) throw new Error('el feed respondió, pero sin entradas (¿cambió el formato del sitio?)');
  return parsearFeed(xml);
}
