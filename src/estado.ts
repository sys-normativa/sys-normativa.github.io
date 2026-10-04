// Lo que el monitor recuerda entre corridas: hasta qué comunicación del BCRA
// leyó y qué versión de cada texto ordenado vio. Es un JSON en datos/ para
// poder correrlo en cualquier lado (incluido un cron gratuito) sin base de datos.

import { readFile, writeFile } from 'node:fs/promises';
import type { TipoCom } from './fuentes/bcraComunicaciones.js';

export interface Estado {
  ultimaComunicacion: Partial<Record<TipoCom, number>>;
  textosOrdenados: Record<string, string>;
  /** Último día del Boletín Oficial leído completo (sin contar hoy, que se relee en cada corrida). */
  boletinHasta?: string;
  /**
   * Números salteados: no existían cuando ya había uno más alto publicado.
   * Se vuelven a buscar en cada corrida por si se publican tarde.
   */
  pendientes?: Partial<Record<TipoCom, { numero: number; desde: string }[]>>;
  /** Último día del Boletín Oficial de Córdoba leído completo (igual que `boletinHasta`). */
  cordobaHasta?: string;
  /** Noticias del BCRA ya leídas (identificadores del sitio), para no repetirlas. */
  prensaVistas?: string[];
  /** Fuentes que estaban fallando en la última corrida (ya se avisó por mail). */
  fallasAvisadas?: string[];
}

const RUTA = new URL('../datos/estado.json', import.meta.url);

export async function leerEstado(): Promise<Estado> {
  try {
    return JSON.parse(await readFile(RUTA, 'utf8')) as Estado;
  } catch {
    return { ultimaComunicacion: {}, textosOrdenados: {} };
  }
}

export async function guardarEstado(e: Estado): Promise<void> {
  await writeFile(RUTA, JSON.stringify(e, null, 2) + '\n', 'utf8');
}
