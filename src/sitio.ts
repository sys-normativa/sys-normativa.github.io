// Arma la página única del monitor (salida/index.html): estilos, lógica y
// todos los informes en un solo archivo. Se abre con doble clic o se publica
// tal cual en cualquier hosting estático.

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import type { Resumen } from './informe.js';
import { TEMAS } from './temas.js';

const AYUDA = `
<div class="sobre-titulo">Guía rápida</div>
<h1>Cómo funciona</h1>
<p class="bajada">Un monitor que revisa todos los días hábiles las normas nuevas que pueden afectar a <strong>SYS Global Pay</strong>, billetera virtual para empresas registrada en el BCRA como proveedor de servicios de pago (PSP).</p>

<h2>Qué revisa</h2>
<div class="grilla">
<div class="caja"><h3><span class="icono-tema" style="--h:225"><span data-icono="documento"></span></span>Boletín Oficial</h3><p>Todas las normas del día (primera sección). Ahí salen la UIF, ARCA, la CNV, los decretos y algunas comunicaciones del BCRA.</p></div>
<div class="caja"><h3><span class="icono-tema" style="--h:245"><span data-icono="banco"></span></span>Comunicaciones del BCRA</h3><p>Cada comunicación nueva: "A" (normas), "B" (informativas) y "C" (correcciones). La mayoría <em>no</em> sale en el Boletín Oficial.</p></div>
<div class="caja"><h3><span class="icono-tema" style="--h:160"><span data-icono="escudo"></span></span>Textos ordenados</h3><p>La versión consolidada de los 9 temas del BCRA que regulan a SYS. Si alguno cambia, avisa. Es la red de seguridad.</p></div>
<div class="caja"><h3><span class="icono-tema" style="--h:95"><span data-icono="mapa"></span></span>Rentas Córdoba</h3><p>La normativa impositiva de Córdoba, donde SYS tiene su base: Ingresos Brutos, agentes de retención, padrones y SIRCUPA, con el resumen que publica Rentas.</p></div>
<div class="caja"><h3><span class="icono-tema" style="--h:30"><span data-icono="chispa"></span></span>Prensa del BCRA</h3><p>Las noticias y comunicados del BCRA. No son normas, pero a veces anuncian medidas antes de que salgan: llegan como "Para revisar".</p></div>
</div>

<h2>Qué significa cada color</h2>
<div class="caja leyenda">
<div><span class="pill alta">Le afecta</span><span>Le cambia algo a SYS como billetera, o el BCRA la dirige a los PSP. Trae qué hacer. <strong>La tiene que ver compliance.</strong></span></div>
<div><span class="pill rev">Para revisar</span><span>Nombra temas de SYS, pero no está claro que le cambie algo: depende de cómo opere SYS (por ejemplo, si opera con el exterior) o la IA no ve impacto. Alcanza con una mirada rápida. La IA nunca puede esconder una norma que nombra la actividad de SYS.</span></div>
<div><span class="pill nada">No aplica</span><span>Pasó el primer filtro, pero no le cambia nada a SYS. Queda plegada al final de cada día, con el motivo, y no genera mail.</span></div>
<div><span class="pill alta">⚠ Fuente falló</span><span>No se pudo leer alguna fuente (por ejemplo, la web del BCRA estaba caída). Lo que no se leyó puede tener novedades: hay que mirarlo a mano. El monitor <strong>nunca</strong> dice "no hubo nada" si no pudo revisar.</span></div>
</div>

<h2>Cómo leer cada norma</h2>
<div class="grilla dos">
<div class="caja"><h3><span class="icono-tema" style="--h:245"><span data-icono="chispa"></span></span>En pocas palabras</h3><p>Qué cambia, si le aplica a SYS y qué tiene que hacer, hecho con IA. Puede equivocarse: el texto de la norma está siempre a un clic.</p></div>
<div class="caja"><h3><span class="icono-tema" style="--h:200"><span data-icono="documento"></span></span>Qué cambia y para qué</h3><p>Lo que dispone la norma y el objetivo que declara, con sus propias palabras.</p></div>
<div class="caja"><h3><span class="icono-tema" style="--h:350"><span data-icono="billetera"></span></span>Cómo le afecta a SYS</h3><p>A quién va dirigida y qué parte del negocio de SYS toca.</p></div>
<div class="caja"><h3><span class="icono-tema" style="--h:55"><span data-icono="calendario"></span></span>Fechas y relacionadas</h3><p>Desde cuándo rige, qué plazo da y qué otras normas cita, con link. A veces el cambio de fondo está en una de ellas.</p></div>
</div>

<h2>Cuándo se actualiza</h2>
<div class="caja"><p>De lunes a viernes a las <strong>10:00</strong> y a las <strong>22:00</strong>, y los sábados a las <strong>12:00</strong> (hora de Argentina). Cada revisión suma solo lo nuevo. Cuando aparece algo, llega un aviso por mail.</p><p>Si una fuente no responde, se avisa y la revisión siguiente vuelve a intentar: los días del Boletín que no se pudieron leer se recuperan solos.</p></div>

<h2>Límites</h2>
<div class="caja"><ul>
<li>La detección es automática y por reglas. <strong>No reemplaza la lectura de la norma</strong> por parte de un profesional.</li>
<li>El filtro es generoso a propósito: es peor perder una norma que mostrar una de más. Por eso aparecen normas "Para revisar" que muchas veces no aplican.</li>
<li>De las provincias, por ahora solo revisa Córdoba, y ahí la normativa impositiva (lo que publica Rentas). El Boletín Oficial de Córdoba no se puede leer desde el servidor: bloquea conexiones de fuera del país.</li>
<li>Tampoco revisa los proyectos de ley del Congreso.</li>
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
<meta name="description" content="Normas del Boletín Oficial y del BCRA que pueden afectar a SYS Global Pay, explicadas y actualizadas todos los días hábiles.">
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
<footer><div class="linea"><span>Fuentes oficiales: Boletín Oficial de la República Argentina y Banco Central (BCRA).</span><span>Detección automática por reglas. No reemplaza la lectura de la norma.</span></div></footer>
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
