// Boletín Oficial de la República Argentina, primera sección (legislación y
// avisos oficiales). La lista del día es HTML plano y completa, sin paginar:
// https://www.boletinoficial.gob.ar/seccion/primera/AAAAMMDD
// Cada aviso trae el texto completo de la norma en su página de detalle.

import { enParalelo, pedir, pedirTexto } from '../http.js';
import { decodificarEntidades, htmlATexto } from '../texto.js';

const BASE = 'https://www.boletinoficial.gob.ar';

export interface AvisoBO {
  id: string;
  url: string;
  organismo: string;
  titulo: string;
  texto: string;
  /** De qué boletín sale, si no es el nacional (p. ej. "Boletín Oficial de Córdoba"). */
  boletin?: string;
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
  // Un día sin edición (fin de semana, feriado) el sitio redirige a la portada.
  // La redirección no se sigue: desde GitHub la portada falla ("fetch failed",
  // domingo 4/10/2026) y no hace falta leerla.
  const res = await pedir(`${BASE}/seccion/primera/${fecha}`, 3, { seguirRedireccion: false });
  if (res.status >= 300 && res.status < 400) return [];
  if (!res.ok) throw new Error(`HTTP ${res.status} al pedir la sección del día`);
  const lista = parsearLista(await res.text());
  const delDia = lista.filter((r) => r.ruta.endsWith(`/${fecha}`));
  // La página del día respondió pero no se reconoce ningún aviso: lo más
  // probable es que haya cambiado el formato. Nunca se informa como "no hubo
  // edición", porque eso escondería las normas del día.
  if (!delDia.length) throw new Error('la página del día respondió, pero no se pudo leer ningún aviso (¿cambió el formato del sitio?)');
  // Pedidos en paralelo: 4 en la corrida diaria; los estudios pueden pedir más.
  const avisos = await enParalelo(delDia, Number(process.env.BO_PARALELO) || 4, async (r) => ({
    id: r.id,
    url: BASE + r.ruta,
    organismo: r.organismo,
    titulo: r.titulo,
    texto: parsearCuerpo(await pedirTexto(BASE + r.ruta)),
  }));
  // Lo mismo con el texto de cada aviso: sin texto, el filtro solo vería el título.
  const sinTexto = avisos.filter((a) => !a.texto).length;
  if (sinTexto > avisos.length / 4) throw new Error(`no se pudo leer el texto de ${sinTexto} de ${avisos.length} avisos (¿cambió el formato del sitio?)`);
  return avisos;
}
