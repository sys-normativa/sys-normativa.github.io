// Aviso cuando aparece algo nuevo. En el servidor (GitHub Actions) el aviso se
// publica como un "issue" del repositorio y GitHub lo manda por mail al dueño:
// no hace falta guardar contraseñas de correo en ningún lado.
//
// Además se arma un mail formal para otras personas (MAIL_ARCHIVO), que manda
// src/mail.ts: solo normas, nunca errores técnicos, que van solo a Guido.
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

const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface Mail {
  asunto: string;
  html: string;
  texto: string;
}

/** Mail para los destinatarios externos: solo lo que le afecta o hay que revisar. */
export function armarMail(fecha: string, nuevos: Hallazgo[], sitio: string): Mail | null {
  const altas = nuevos.filter((h) => h.evaluacion.nivel === 'alta');
  const rev = nuevos.filter((h) => h.evaluacion.nivel === 'revisar');
  if (!altas.length && !rev.length) return null;

  const partes: string[] = [];
  if (altas.length) partes.push(`${altas.length} ${altas.length === 1 ? 'norma que afecta' : 'normas que afectan'} a SYS`);
  if (rev.length) partes.push(`${rev.length} para revisar`);
  const [, m, d] = fecha.split('-');
  const asunto = `Monitor normativo SYS – ${Number(d)}/${Number(m)}: ${partes.join(' y ')}`;

  const resumen = (h: Hallazgo) => (h.resumenIa ? `${h.resumenIa.queCambia} ${h.resumenIa.comoAfecta}` : h.comoAfecta.join(' '));
  const queHacer = (h: Hallazgo) => h.resumenIa?.queHacer || h.queHacer;
  const nombre = (h: Hallazgo) => `${h.titulo}${h.asunto ? ` – ${h.asunto}` : ''}`;
  const hayIa = [...altas, ...rev].some((h) => h.resumenIa);

  // Texto plano, para los programas de correo que no muestran HTML.
  const t = [`Novedades normativas del ${fechaLarga(fecha)}.`, ''];
  const seccionTexto = (titulo: string, hs: Hallazgo[]) => {
    if (!hs.length) return;
    t.push(titulo.toUpperCase(), '');
    for (const h of hs) t.push(nombre(h), `${h.emisor} · ${h.fecha}`, resumen(h), queHacer(h) ? `Qué hacer: ${queHacer(h)}` : '', `Texto oficial: ${h.url}`, '');
  };
  seccionTexto('Le afecta a SYS', altas);
  seccionTexto('Para revisar', rev);
  t.push(`Informe completo: ${sitio}`);
  if (hayIa) t.push('', 'Las síntesis se generan automáticamente; ante cualquier duda, prevalece el texto oficial.');

  const tarjeta = (h: Hallazgo, color: string) => `
<div style="border-left:4px solid ${color};padding:12px 16px;margin:0 0 16px;background:#f7f8fa">
  <div style="font-weight:bold;font-size:15px">${escapar(nombre(h))}</div>
  <div style="color:#666;font-size:13px;margin:2px 0 8px">${escapar(h.emisor)} · ${escapar(h.fecha)}</div>
  <div style="font-size:14px;line-height:1.5">${escapar(resumen(h))}</div>
  ${queHacer(h) ? `<div style="font-size:14px;line-height:1.5;margin-top:8px"><b>Qué hacer:</b> ${escapar(queHacer(h))}</div>` : ''}
  <div style="margin-top:8px;font-size:13px"><a href="${escapar(h.url)}">Ver el texto oficial</a></div>
</div>`;
  const seccion = (titulo: string, nota: string, hs: Hallazgo[], color: string) =>
    hs.length ? `<h2 style="font-size:17px;margin:24px 0 4px">${titulo}</h2>${nota ? `<p style="color:#666;font-size:13px;margin:0 0 12px">${nota}</p>` : ''}${hs.map((h) => tarjeta(h, color)).join('')}` : '';
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#222;max-width:640px">
<p style="font-size:15px">Novedades normativas del ${escapar(fechaLarga(fecha))}.</p>
${seccion('Le afecta a SYS', '', altas, '#c0392b')}
${seccion('Para revisar', 'Normas vinculadas a la actividad de SYS cuya aplicabilidad requiere evaluación.', rev, '#d68910')}
<p style="margin:24px 0"><a href="${escapar(sitio)}" style="background:#1f4e79;color:#fff;padding:10px 18px;text-decoration:none;border-radius:4px">Ver el informe completo</a></p>
${hayIa ? '<p style="color:#888;font-size:12px">Las síntesis se generan automáticamente; ante cualquier duda, prevalece el texto oficial.</p>' : ''}
</div>`;
  return { asunto, html, texto: t.join('\n') };
}

export async function dejarAviso(fecha: string, nuevos: Hallazgo[], errores: string[]): Promise<void> {
  const archivo = process.env.AVISO_ARCHIVO;
  if (!archivo) return;
  const aviso = armarAviso(fecha, nuevos, errores, process.env.SITIO_URL ?? '');
  if (aviso) await writeFile(archivo, JSON.stringify(aviso), 'utf8');
  const mail = process.env.MAIL_ARCHIVO && armarMail(fecha, nuevos, process.env.SITIO_URL ?? '');
  if (mail) await writeFile(process.env.MAIL_ARCHIVO!, JSON.stringify(mail), 'utf8');
}
