// Boletín Oficial de la República Argentina, primera sección (legislación y
// avisos oficiales). La lista del día es HTML plano y completa, sin paginar:
// https://www.boletinoficial.gob.ar/seccion/primera/AAAAMMDD
// Cada aviso trae el texto completo de la norma en su página de detalle.

import { enParalelo, pedirTexto } from '../http.js';
import { decodificarEntidades, htmlATexto } from '../texto.js';

const BASE = 'https://www.boletinoficial.gob.ar';

export interface AvisoBO {
  id: string;
  url: string;
  organismo: string;
  titulo: string;
  texto: string;
}

interface Renglon {
  id: string;
  ruta: string;
  organismo: string;
  titulo: string;
}

function limpiar(s: string): string {
  return decodificarEntidades(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function parsearLista(html: string): Renglon[] {
  const out: Renglon[] = [];
  const re = /<a href="(\/detalleAviso\/primera\/(\d+)\/\d{8})"[^>]*>([\s\S]*?)<\/a>/g;
  for (const m of html.matchAll(re)) {
    const organismo = /<p class="item">([\s\S]*?)<\/p>/.exec(m[3]);
    if (!organismo) continue;
    const detalles = [...m[3].matchAll(/<p class="item-detalle"[^>]*>([\s\S]*?)<\/p>/g)].map((d) => limpiar(d[1]));
    out.push({ id: m[2], ruta: m[1], organismo: limpiar(organismo[1]), titulo: detalles[0] ?? '' });
  }
  // La misma página repite enlaces (p. ej. en el sumario): uno por aviso.
  return [...new Map(out.map((r) => [r.id, r])).values()];
}

export function parsearCuerpo(html: string): string {
  const inicio = html.indexOf('id="cuerpoDetalleAviso"');
  if (inicio === -1) return '';
  const resto = html.slice(inicio);
  // El cuerpo termina donde empiezan los avisos relacionados / pie de página.
  const fin = resto.search(/<div[^>]+id="(anexos|avisosRelacionados)"|<footer/);
  return htmlATexto('<div ' + (fin === -1 ? resto : resto.slice(0, fin)));
}

/** fecha en formato AAAAMMDD. Devuelve [] si ese día no hubo edición. */
export async function avisosDelDia(fecha: string): Promise<AvisoBO[]> {
  const lista = parsearLista(await pedirTexto(`${BASE}/seccion/primera/${fecha}`));
  const delDia = lista.filter((r) => r.ruta.endsWith(`/${fecha}`));
  return enParalelo(delDia, 4, async (r) => ({
    id: r.id,
    url: BASE + r.ruta,
    organismo: r.organismo,
    titulo: r.titulo,
    texto: parsearCuerpo(await pedirTexto(BASE + r.ruta)),
  }));
}
