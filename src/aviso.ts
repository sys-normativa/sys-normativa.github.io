// Aviso cuando aparece algo nuevo. En el servidor (GitHub Actions) el aviso se
// publica como un "issue" del repositorio y GitHub lo manda por mail al dueño:
// no hace falta guardar contraseñas de correo en ningún lado.
//
// Este módulo solo arma el texto y lo deja en el archivo que diga la variable
// AVISO_ARCHIVO. El workflow lo publica. Sin esa variable (en la compu), no hace nada.

import { writeFile } from 'node:fs/promises';
import type { Hallazgo } from './explicar.js';
import { fechaLarga } from './informe.js';

// Se lo menciona en el aviso para que GitHub le mande el mail sí o sí.
const DESTINATARIO = '@Guidoparisi91';

export function armarAviso(fecha: string, nuevos: Hallazgo[], errores: string[], sitio: string): { titulo: string; cuerpo: string } | null {
  // Lo que la IA descartó no se avisa: queda plegado en la página.
  const altas = nuevos.filter((h) => h.evaluacion.nivel === 'alta');
  const rev = nuevos.filter((h) => h.evaluacion.nivel === 'revisar');
  if (!altas.length && !rev.length && !errores.length) return null;

  const partes: string[] = [];
  if (altas.length) partes.push(`${altas.length} le ${altas.length === 1 ? 'afecta' : 'afectan'}`);
  if (rev.length) partes.push(`${rev.length} para revisar`);
  if (errores.length) partes.push(`⚠ ${errores.length} ${errores.length === 1 ? 'fuente no disponible' : 'fuentes no disponibles'}`);
  const [, m, d] = fecha.split('-');
  const titulo = `Normativa SYS ${Number(d)}/${Number(m)}: ${partes.join(', ')}`;

  const item = (h: Hallazgo) =>
    [
      `### ${h.titulo}${h.asunto ? ` — ${h.asunto}` : ''}`,
      `${h.emisor} · ${h.fecha}`,
      '',
      h.resumenIa ? `${h.resumenIa.queCambia} ${h.resumenIa.comoAfecta}` : h.comoAfecta.join(' '),
      h.resumenIa?.queHacer ? `\n**Qué hacer:** ${h.resumenIa.queHacer}` : '',
      '',
      `[Ver la norma](${h.url})`,
    ].join('\n');

  const c = [`Novedades normativas del ${fechaLarga(fecha)}. ${DESTINATARIO}`, '', `**[Ver el informe completo](${sitio})**`, ''];
  if (errores.length) c.push('## ⚠ Fuentes no disponibles', 'Se recomienda verificarlas manualmente; la próxima actualización volverá a consultarlas.', '', ...errores.map((e) => `- ${e}`), '');
  if (altas.length) c.push('## Le afecta a SYS', '', altas.map(item).join('\n\n'), '');
  if (rev.length) c.push('## Para revisar', 'Normas vinculadas a la actividad de SYS cuya aplicabilidad requiere evaluación.', '', rev.map(item).join('\n\n'), '');
  if (nuevos.some((h) => h.resumenIa)) c.push('<sub>Síntesis generadas automáticamente. Verificar con el texto oficial.</sub>');
  return { titulo, cuerpo: c.join('\n') };
}

export async function dejarAviso(fecha: string, nuevos: Hallazgo[], errores: string[]): Promise<void> {
  const archivo = process.env.AVISO_ARCHIVO;
  if (!archivo) return;
  const aviso = armarAviso(fecha, nuevos, errores, process.env.SITIO_URL ?? '');
  if (aviso) await writeFile(archivo, JSON.stringify(aviso), 'utf8');
}
