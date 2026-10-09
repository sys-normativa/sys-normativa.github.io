// Manda por Gmail el mail que dejó armado la corrida (MAIL_ARCHIVO) a los
// destinatarios externos. Todo sale de secretos del repo, nunca del código:
//   GMAIL_USUARIO       cuenta que manda (p. ej. alguien@gmail.com)
//   GMAIL_APP_PASSWORD  contraseña de aplicación de esa cuenta
//   AVISO_MAILS         destinatarios, separados por coma
// Van en copia oculta: ninguno ve la dirección de los demás.
//
// npm run mail             manda el mail de la corrida, si lo hay
// npm run mail -- --prueba manda un mail de prueba

import { readFile } from 'node:fs/promises';
import nodemailer from 'nodemailer';
import type { Mail } from './aviso.js';

const usuario = process.env.GMAIL_USUARIO;
const clave = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');
const destinatarios = (process.env.AVISO_MAILS ?? '').split(/[,;\s]+/).filter(Boolean);
const sitio = process.env.SITIO_URL ?? 'https://sys-normativa.github.io/';

if (!usuario || !clave || !destinatarios.length) {
  console.log('Faltan GMAIL_USUARIO, GMAIL_APP_PASSWORD o AVISO_MAILS: no se manda mail.');
  process.exit(0);
}

let mail: Mail;
if (process.argv.includes('--prueba')) {
  mail = {
    asunto: 'Monitor normativo SYS – Alta de avisos',
    texto: `A partir de hoy, esta dirección recibirá un aviso cada vez que se publique una norma que afecte a SYS Global Pay o que requiera revisión.\n\nInforme completo: ${sitio}`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#222;max-width:640px"><p style="font-size:15px">A partir de hoy, esta dirección recibirá un aviso cada vez que se publique una norma que afecte a SYS Global Pay o que requiera revisión.</p><p style="margin:24px 0"><a href="${sitio}" style="background:#1f4e79;color:#fff;padding:10px 18px;text-decoration:none;border-radius:4px">Ver el monitor</a></p></div>`,
  };
} else {
  const archivo = process.env.MAIL_ARCHIVO;
  try {
    mail = JSON.parse(await readFile(archivo ?? '', 'utf8')) as Mail;
  } catch {
    console.log('Nada nuevo para avisar: no se manda mail.');
    process.exit(0);
  }
}

const transporte = nodemailer.createTransport({ service: 'gmail', auth: { user: usuario, pass: clave } });
await transporte.sendMail({
  from: { name: 'Monitor normativo SYS', address: usuario },
  to: { name: 'Monitor normativo SYS', address: usuario },
  bcc: destinatarios,
  subject: mail.asunto,
  text: mail.texto,
  html: mail.html,
});
console.log(`Mail enviado a ${destinatarios.length} destinatario(s).`);
