// Noticias y comunicados de prensa del BCRA: no son normas, pero a veces
// anuncian medidas antes de la comunicación formal.
// Listado: https://www.bcra.gob.ar/noticias/ con las 10 más nuevas. Las páginas
// siguientes se cargan con botones por detrás (no tienen dirección propia) y la
// API del sitio está cerrada a propósito: se lee solo la primera página. El BCRA
// publica 2 o 3 por semana, así que entre dos corridas nunca se juntan 10.

import { pedir, pedirTexto } from '../http.js';
import { decodificarEntidades, htmlATexto } from '../texto.js';

const BASE = 'https://www.bcra.gob.ar/noticias/';

export interface Noticia {
  /** Identificador estable del sitio ("post-105483"). */
  id: string;
  url: string;
  titulo: string;
  /** AAAA-MM-DD */
  fecha: string;
  bajada: string;
  texto: string;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "03 de septiembre de 2026" -> "2026-09-03". */
export function fechaDeNoticia(s: string): string {
  const m = /(\d{1,2}) de (\p{L}+) de (\d{4})/u.exec(s.toLowerCase());
  const mes = m ? MESES.indexOf(m[2]) + 1 : 0;
  return m && mes ? `${m[3]}-${String(mes).padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';
}

const limpiar = (s: string) => decodificarEntidades(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

export function parsearListado(html: string): Omit<Noticia, 'texto'>[] {
  const out: Omit<Noticia, 'texto'>[] = [];
  for (const m of html.matchAll(/<article id="(post-\d+)"[\s\S]*?<\/article>/g)) {
    const a = m[0];
    const enlace = /<h2 class="entry-title">\s*<a href="([^"]+)">([\s\S]*?)<\/a>/.exec(a);
    if (!enlace) continue;
    out.push({
      id: m[1],
      url: enlace[1],
      titulo: limpiar(enlace[2]),
      fecha: fechaDeNoticia(limpiar(/<span class="published">([\s\S]*?)<\/span>/.exec(a)?.[1] ?? '')),
      bajada: limpiar(/<div class="post-content-inner">([\s\S]*?)<\/div>/.exec(a)?.[1] ?? ''),
    });
  }
  return out;
}

/** El cuerpo de la noticia, sin menú ni pie. */
export function parsearNoticia(html: string): string {
  const inicio = html.indexOf('et_pb_text_inner');
  if (inicio === -1) return '';
  const fin = html.search(/<footer|id="main-footer"/);
  return htmlATexto(html.slice(html.lastIndexOf('<div', inicio), fin === -1 ? undefined : fin))
    .replace(/^Inicio\s*(&raquo;|»)\s*Noticias\s*/i, '')
    .replace(/\s*Compartir en[\s\S]*$/, '')
    .trim();
}

/** Las 10 noticias más nuevas. */
export async function listarNoticias(): Promise<Omit<Noticia, 'texto'>[]> {
  const res = await pedir(BASE);
  if (!res.ok) throw new Error(`HTTP ${res.status} al pedir el listado de noticias`);
  const lista = parsearListado(await res.text());
  // El listado nunca está vacío: si no se reconoce ninguna noticia, cambió el formato.
  if (!lista.length) throw new Error('el listado de noticias respondió, pero no se reconoce ninguna (¿cambió el formato del sitio?)');
  return lista;
}

export async function leerNoticia(n: Omit<Noticia, 'texto'>): Promise<Noticia> {
  return { ...n, texto: parsearNoticia(await pedirTexto(n.url)) || n.bajada };
}
