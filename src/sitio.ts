// Arma la página única del monitor (salida/index.html): estilos, lógica y
// todos los informes en un solo archivo. Se abre con doble clic o se publica
// tal cual en cualquier hosting estático.

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import type { Resumen } from './informe.js';
import { TEMAS } from './temas.js';

const AYUDA = `
<div class="sobre-titulo">Información del servicio</div>
<h1>Cómo funciona</h1>
<p class="bajada">Servicio de monitoreo normativo para <strong>SYS Global Pay</strong>, proveedor de servicios de pago registrado en el BCRA. Identifica las normas publicadas por los organismos que regulan su actividad, evalúa su impacto e indica las acciones requeridas.</p>

<h2>Fuentes monitoreadas</h2>
<div class="grilla">
<div class="caja"><h3><span class="icono-tema" style="--h:225"><span data-icono="documento"></span></span>Boletín Oficial</h3><p>Primera sección completa: normas de la UIF, ARCA, la CNV, la Comisión Arbitral, decretos y comunicaciones del BCRA publicadas allí.</p></div>
<div class="caja"><h3><span class="icono-tema" style="--h:245"><span data-icono="banco"></span></span>Comunicaciones del BCRA</h3><p>Comunicaciones "A", "B" y "C" publicadas por el Banco Central, incluidas las que no se publican en el Boletín Oficial.</p></div>
<div class="caja"><h3><span class="icono-tema" style="--h:160"><span data-icono="escudo"></span></span>Textos ordenados del BCRA</h3><p>Control de cambios en los nueve textos ordenados que regulan la actividad de SYS.</p></div>
<div class="caja"><h3><span class="icono-tema" style="--h:95"><span data-icono="mapa"></span></span>Rentas Córdoba</h3><p>Normativa tributaria de la Provincia de Córdoba: Ingresos Brutos, regímenes de retención y percepción, padrones y SIRCUPA.</p></div>
<div class="caja"><h3><span class="icono-tema" style="--h:30"><span data-icono="chispa"></span></span>Comunicados del BCRA</h3><p>Anuncios de prensa del Banco Central que pueden anticipar nuevas regulaciones. Se informan como "Para revisar".</p></div>
</div>

<h2>Metodología</h2>
<div class="caja"><p>Cada norma se evalúa en dos instancias. Primero, un filtro por términos y organismos vinculados a la actividad de SYS. Luego, un análisis del texto que determina su aplicabilidad, sintetiza su contenido e indica las acciones requeridas.</p><p>Las comunicaciones del BCRA dirigidas a los proveedores de servicios de pago, las normas que mencionan expresamente la actividad de SYS y las resoluciones de la UIF se informan siempre.</p></div>

<h2>Clasificación</h2>
<div class="caja leyenda">
<div><span class="pill alta">Le afecta</span><span>Norma con impacto en la operatoria o las obligaciones de SYS. Incluye las acciones requeridas y sus plazos.</span></div>
<div><span class="pill rev">Para revisar</span><span>Norma vinculada a la actividad de SYS cuya aplicabilidad depende de su operatoria o requiere evaluación.</span></div>
<div><span class="pill nada">Sin impacto</span><span>Norma analizada que no requiere acciones. Se lista al final de cada informe como referencia.</span></div>
<div><span class="pill alta">⚠ Fuente no disponible</span><span>Una fuente no pudo consultarse. Se indica en el informe y se vuelve a consultar en la siguiente actualización, recuperando los días pendientes.</span></div>
</div>

<h2>Contenido de cada norma</h2>
<div class="grilla dos">
<div class="caja"><h3><span class="icono-tema" style="--h:245"><span data-icono="chispa"></span></span>Síntesis</h3><p>Aplicabilidad, contenido, alcance para SYS y acciones requeridas, con sus plazos cuando la norma los establece.</p></div>
<div class="caja"><h3><span class="icono-tema" style="--h:350"><span data-icono="externo"></span></span>Texto oficial</h3><p>Acceso directo a la publicación en el Boletín Oficial, el BCRA o Rentas Córdoba.</p></div>
<div class="caja"><h3><span class="icono-tema" style="--h:200"><span data-icono="documento"></span></span>Detalle</h3><p>Texto de la disposición, fundamentos, destinatarios, fechas de vigencia y normas relacionadas.</p></div>
<div class="caja"><h3><span class="icono-tema" style="--h:55"><span data-icono="ojo"></span></span>Criterios de detección</h3><p>Términos y organismo que motivaron su inclusión en el informe.</p></div>
</div>

<h2>Actualización y notificaciones</h2>
<div class="caja"><p>Lunes a viernes por la mañana (entre las 9:45 y las 11:30) y por la noche (entre las 21:45 y las 23:30), y sábados al mediodía (hora de Argentina). La fecha y hora de la última actualización se indican en el encabezado.</p><p>Se envía una notificación por correo electrónico ante cada norma nueva clasificada como "Le afecta" o "Para revisar", y ante la falta de disponibilidad de una fuente.</p></div>

<h2>Alcance</h2>
<div class="caja"><ul>
<li>Este servicio es una herramienta de alerta y no reemplaza el análisis jurídico profesional de la normativa.</li>
<li>Las síntesis se generan automáticamente y deben verificarse con el texto oficial.</li>
<li>Alcance provincial: Provincia de Córdoba, normativa tributaria publicada por Rentas Córdoba.</li>
<li>No incluye proyectos de ley ni otras secciones del Boletín Oficial.</li>
</ul></div>`;

/** `dias` en cualquier orden; la página los muestra del más nuevo al más viejo. */
export async function armarSitio(dias: Resumen[], generado: string): Promise<string> {
  const leer = (f: string) => readFile(new URL(`./sitio/${f}`, import.meta.url), 'utf8');
  const [css, js] = await Promise.all([leer('estilos.css'), leer('app.js')]);
  const datos = {
    generado,
    temas: Object.fromEntries(Object.entries(TEMAS).map(([id, t]) => [id, t.nombre])),
    dias: [...dias].sort((a, b) => b.fecha.localeCompare(a.fecha)),
  };
  // "</" cortaría el <script>; "<\/" es el mismo JSON y no lo corta.
  const json = JSON.stringify(datos).replace(/<\//g, '<\\/');

  return `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Monitor normativo · SYS Global Pay</title>
<meta name="description" content="Normas del Boletín Oficial, el BCRA y Rentas Córdoba que pueden afectar a SYS Global Pay, explicadas y con qué hacer.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='6' fill='%234338ca'/%3E%3Cpath d='M12 4.5l5.5 2.3v3.9c0 3.6-2.3 6.5-5.5 7.8-3.2-1.3-5.5-4.2-5.5-7.8V6.8L12 4.5z' fill='none' stroke='white' stroke-width='1.6'/%3E%3Cpath d='M9.6 11.2l1.7 1.7 3.2-3.2' fill='none' stroke='white' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
<header class="cabecera"><div class="cabecera-in">
<div class="identidad">
<div class="logo" data-icono="escudo"></div>
<div class="nombre">Monitor normativo<small>SYS Global Pay</small></div>
<div class="actualizado" id="actualizado"><span class="pulso"></span></div>
</div>
<div class="actualizado-movil" id="actualizado-movil"></div>
<nav class="pestanas" aria-label="Secciones">
<a href="#ultimo" data-icono="inicio"> Último informe</a>
<a href="#dias" data-icono="calendario"> Por día</a>
<a href="#ayuda" data-icono="ayuda"> Cómo funciona</a>
</nav>
</div></header>
<main class="pagina" id="vista"></main>
<footer><div class="linea"><span>Fuentes oficiales: Boletín Oficial de la República Argentina, Banco Central de la República Argentina y Rentas Córdoba.</span><span>Herramienta de alerta. No reemplaza el análisis profesional de la normativa.</span></div></footer>
<template id="ayuda">${AYUDA}</template>
<script id="datos" type="application/json">${json}</script>
<script>${js}</script>
</body>
</html>
`;
}

/** Rearma salida/index.html con todos los informes guardados en datos/informes/. */
export async function escribirSitio(generado: string): Promise<void> {
  const informes = new URL('../datos/informes/', import.meta.url);
  const salida = new URL('../salida/', import.meta.url);
  const dias: Resumen[] = [];
  for (const f of (await readdir(informes)).filter((x) => /^\d{4}-\d{2}-\d{2}\.json$/.test(x))) {
    dias.push(JSON.parse(await readFile(new URL(f, informes), 'utf8')) as Resumen);
  }
  await mkdir(salida, { recursive: true });
  await writeFile(new URL('index.html', salida), await armarSitio(dias, generado), 'utf8');
}
