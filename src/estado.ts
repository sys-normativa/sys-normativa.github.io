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
  /** El Boletín de hoy ya se leyó completo en una corrida anterior (y cuántas normas tenía). */
  boletinHoy?: { fecha: string; normas: number };
  /**
   * Números salteados: no existían cuando ya había uno más alto publicado.
   * Se vuelven a buscar en cada corrida por si se publican tarde.
   */
  pendientes?: Partial<Record<TipoCom, { numero: number; desde: string }[]>>;
  /** Normas de Rentas Córdoba ya leídas (identificadores del sitio). */
  rentasVistas?: string[];
  /** Noticias del BCRA ya leídas (identificadores del sitio), para no repetirlas. */
  prensaVistas?: string[];
  /** Fuentes que estaban fallando en la última corrida (ya se avisó por mail). */
  fallasAvisadas?: string[];
  /** Desde cuándo falla cada fuente (o día del Boletín), para mostrarlo al cliente solo si dura. */
  fallasDesde?: Record<string, string>;
  /** Cuándo terminó la última revisión (ISO). El control de GitHub la usa para saber si cron-job.org dejó de lanzarlo. */
  ultimaCorrida?: string;
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
