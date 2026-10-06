// El informe del día como datos (Resumen, que se guarda en datos/informes/) y
// en Markdown para la consola. La versión para leer es la página de sitio.ts.

import type { Hallazgo } from './explicar.js';
import { TEMAS } from './temas.js';

export type { Hallazgo };

export interface Resumen {
  fecha: string;
  /** Fecha y hora de la corrida, en hora argentina. */
  generado: string;
  hallazgos: Hallazgo[];
  revisado: string[];
  /** Fallas técnicas de la corrida: para el mail a Guido, nunca para el cliente. */
  errores: string[];
  /** Lo que ve el cliente: fuentes que llevan más de 24 h sin poder leerse, en texto formal. */
  demoras?: string[];
  /** Lo que ve el cliente: fuentes que fallan hace menos de 24 h ("actualización en curso"). */
  enCurso?: string[];
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "2026-10-02" -> "viernes 2 de octubre de 2026". */
export function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dia = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DIAS[dia]} ${d} de ${MESES[m - 1]} de ${y}`;
}

const altas = (r: Resumen) => r.hallazgos.filter((h) => h.evaluacion.nivel === 'alta');
const paraRevisar = (r: Resumen) => r.hallazgos.filter((h) => h.evaluacion.nivel === 'revisar');

// ---------------------------------------------------------------------------
// Markdown

function bloqueMd(h: Hallazgo): string {
  const l = [
    `### ${h.titulo}${h.asunto ? ` — ${h.asunto}` : ''}`,
    `*${h.emisor} · ${h.fecha} · ${h.tipo} · Tema: ${TEMAS[h.tema].nombre}*`,
    '',
  ];
  if (h.resumenIa) l.push(`**En pocas palabras (IA):** ${h.resumenIa.queCambia} ${h.resumenIa.comoAfecta}`, '');
  l.push(`**Qué cambia:** ${h.queCambia}`);
  if (h.paraQue) l.push('', `**Para qué (según la norma):** ${h.paraQue}`);
  l.push('', `**Cómo le afecta a SYS:** ${h.comoAfecta.join(' ')}`);
  if (h.fechasClave.length) l.push('', '**Fechas clave:**', ...h.fechasClave.map((f) => `- ${f}`));
  if (h.dondeNombraASys) l.push('', `**Dónde nombra a SYS:** > ${h.dondeNombraASys}`);
  if (h.relacionadas.length) l.push('', `**Normas relacionadas:** ${h.relacionadas.map((e) => `[${e.texto}](${e.url})${e.detalle ? ` (${e.detalle})` : ''}`).join(' · ')}`);
  l.push('', `**Qué hacer:** ${h.queHacer}`, '', `[Ver la norma completa](${h.url})`, '', `<sub>Por qué apareció: ${h.evaluacion.motivos.join(', ')}.</sub>`);
  return l.join('\n');
}

export function armarMarkdown(r: Resumen): string {
  const a = altas(r);
  const rev = paraRevisar(r);
  const partes = [`# Novedades normativas para SYS — ${fechaLarga(r.fecha)}`, ''];

  if (r.errores.length) {
    partes.push('> **⚠ Atención: no se pudieron revisar todas las fuentes.** Lo que no se revisó puede tener novedades. Ver "Fuentes que fallaron" al final.', '');
  }
  if (!a.length && !rev.length) partes.push(r.errores.length ? 'En las fuentes que sí se pudieron revisar no apareció nada que afecte a SYS.' : 'Hoy no apareció nada que afecte a SYS.', '');

  if (a.length) partes.push(`## Le afecta a SYS (${a.length})`, '', a.map(bloqueMd).join('\n\n---\n\n'), '');
  if (rev.length) partes.push(`## Para revisar (${rev.length})`, '', 'Tocan temas de SYS, pero puede que no le apliquen.', '', rev.map(bloqueMd).join('\n\n---\n\n'), '');

  partes.push('## Qué se revisó', '', ...r.revisado.map((x) => `- ${x}`), '');
  if (r.errores.length) partes.push('## Fuentes que fallaron (revisar a mano)', '', ...r.errores.map((x) => `- ${x}`), '');
  partes.push(`<sub>Generado el ${r.generado} (hora de Argentina). La detección es automática, por reglas: no reemplaza la lectura de la norma.</sub>`, '');
  return partes.join('\n');
}
