// Arma la página única del monitor (salida/index.html): estilos, lógica y
// todos los informes en un solo archivo. Se abre con doble clic o se publica
// tal cual en cualquier hosting estático.

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import type { Resumen } from './informe.js';
import { TEMAS } from './temas.js';

const AYUDA = `
<div class="ayuda">
<h1>Cómo funciona</h1>
<div class="caja">
<p><strong>Qué es.</strong> Un monitor que revisa las normas nuevas que pueden afectar a <strong>SYS Global Pay</strong>, una billetera virtual para empresas registrada en el BCRA como proveedor de servicios de pago (PSP).</p>
<p><strong>Qué revisa.</strong></p>
<ul>
<li><strong>Boletín Oficial:</strong> todas las normas del día (primera sección). Ahí salen la UIF, ARCA, la CNV, los decretos y algunas comunicaciones del BCRA.</li>
<li><strong>BCRA:</strong> cada comunicación nueva ("A" normativas, "B" informativas, "C" correcciones). La mayoría <em>no</em> sale en el Boletín Oficial.</li>
<li><strong>Textos ordenados del BCRA:</strong> la versión consolidada de los 9 temas que regulan a SYS. Si alguno cambia, avisa. Es la red de seguridad.</li>
</ul>
</div>

<h2>Qué significa cada color</h2>
<div class="caja">
<p><span class="pastilla p-alta">Le afecta</span> La norma nombra a SYS o a su actividad (proveedores de servicios de pago, cuentas de pago, billeteras), o el BCRA la dirige a los PSP. <strong>La tiene que ver compliance.</strong></p>
<p><span class="pastilla p-rev">Para revisar</span> Toca temas de SYS, pero puede que no le aplique. Alcanza con una mirada rápida.</p>
<p><span class="pastilla p-alta">⚠ Fuente falló</span> No se pudo leer alguna fuente (por ejemplo, la web del BCRA estaba caída). Lo que no se leyó puede tener novedades: hay que mirarlo a mano. El monitor <strong>nunca</strong> dice "no hubo nada" si no pudo revisar.</p>
</div>

<h2>Cómo leer cada norma</h2>
<div class="caja">
<ul>
<li><strong>En pocas palabras:</strong> un resumen de dos líneas hecho con IA. Ayuda a entender rápido, pero puede equivocarse: lo que vale es lo que sigue, que sale textual de la norma.</li>
<li><strong>Qué cambia:</strong> lo que dispone la norma, con sus propias palabras.</li>
<li><strong>Para qué:</strong> el objetivo que declara la norma.</li>
<li><strong>Cómo le afecta a SYS:</strong> a quién va dirigida y qué parte del negocio de SYS toca.</li>
<li><strong>Fechas clave:</strong> desde cuándo rige o qué plazo da.</li>
<li><strong>Normas relacionadas:</strong> otras normas que cita, con link. A veces el cambio de fondo está en una de ellas.</li>
<li><strong>Qué hacer</strong> y el botón <strong>Ver la norma completa</strong>, que lleva a la fuente oficial.</li>
</ul>
</div>

<h2>Las pestañas</h2>
<div class="caja">
<ul>
<li><strong>Último informe:</strong> lo que hay que mirar hoy.</li>
<li><strong>Todas las normas:</strong> todo lo encontrado, con filtros por nivel y tema y un buscador.</li>
<li><strong>Por día:</strong> el historial, un informe por cada día revisado.</li>
</ul>
</div>

<h2>Límites</h2>
<div class="caja">
<ul>
<li>La detección es automática y por reglas. <strong>No reemplaza la lectura de la norma</strong> por parte de un profesional.</li>
<li>El filtro es generoso a propósito: es peor perder una norma que muestre una de más. Por eso aparecen normas "Para revisar" que muchas veces no aplican.</li>
<li>Todavía no revisa los boletines provinciales (Ingresos Brutos), el Congreso ni los anuncios de prensa del BCRA.</li>
</ul>
</div>
</div>`;

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
<title>Monitor normativo SYS</title>
<style>${css}</style>
</head>
<body>
<header class="cabecera"><div class="cabecera-in">
<div class="marca">SYS Global Pay · Monitor normativo</div>
<div class="actualizado" id="actualizado"></div>
<nav class="pestanas" aria-label="Secciones">
<a href="#ultimo">Último informe</a>
<a href="#normas">Todas las normas</a>
<a href="#dias">Por día</a>
<a href="#ayuda">Cómo funciona</a>
</nav>
</div></header>
<main class="pagina" id="vista"></main>
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
