// Página única del monitor: pestañas "Último informe", "Por día" y
// "Cómo funciona". Los datos vienen embebidos en la página
// (<script id="datos">), así anda igual abierta desde la compu o publicada.

const DATOS = JSON.parse(document.getElementById('datos').textContent);
const TEMAS = DATOS.temas;
const DIAS = DATOS.dias; // del más nuevo al más viejo
const vista = document.getElementById('vista');

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function partesFecha(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d, dia: DIAS_SEMANA[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] };
}

/** "2026-10-02" -> "viernes 2 de octubre de 2026". */
function fechaLarga(iso) {
  const f = partesFecha(iso);
  return `${f.dia} ${f.d} de ${MESES[f.m - 1]} de ${f.y}`;
}

const esAlta = (h) => h.evaluacion.nivel === 'alta';
const esRevisar = (h) => h.evaluacion.nivel === 'revisar';
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// ---------------------------------------------------------------------------
// Iconos (trazo, 24x24)

const TRAZOS = {
  escudo: '<path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
  alerta: '<path d="M12 3l9.5 17h-19L12 3z"/><path d="M12 10v4M12 17.5v.01"/>',
  ojo: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
  cruz: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  externo: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>',
  chispa: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7L19 16z"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  enlace: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  lupa: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  inicio: '<path d="M4 11l8-7 8 7v8a1 1 0 01-1 1h-5v-6h-4v6H5a1 1 0 01-1-1v-8z"/>',
  ayuda: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.5M12 17v.01"/>',
  documento: '<path d="M7 3h7l5 5v12a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  banco: '<path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  billetera: '<path d="M4 7a2 2 0 012-2h11v4"/><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 13.5h2"/>',
  flechas: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  persona: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-3.5 3.8-5.5 7-5.5s6 2 7 5.5"/>',
  candado: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 018 0v2.5"/>',
  globo: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.5 5.7 3.5 9s-1 6.3-3.5 9c-2.5-2.7-3.5-5.7-3.5-9S9.5 5.7 12 3z"/>',
  recibo: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"/><path d="M9 8h6M9 12h6"/>',
  porcentaje: '<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  mapa: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
  grafico: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  datos: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  informe: '<path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  edificio: '<path d="M4 21V5a1 1 0 011-1h9v17M14 9h5a1 1 0 011 1v11M2 21h20M8 8h2M8 12h2M8 16h2"/>',
};

function icono(nombre) {
  return `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TRAZOS[nombre] ?? ''}</svg>`;
}

// Cada tema tiene un icono y un tono propio, para reconocerlo de un vistazo.
const ESTILO_TEMA = {
  psp: ['billetera', 245],
  pagos: ['flechas', 200],
  usuarios: ['persona', 160],
  tecnologia: ['candado', 280],
  cambios: ['globo', 30],
  lavado: ['escudo', 350],
  impuestos: ['recibo', 15],
  cheque: ['porcentaje', 45],
  iibb: ['mapa', 95],
  cnv: ['grafico', 175],
  datos: ['datos', 220],
  informativo: ['informe', 260],
  operativo: ['calendario', 55],
  general: ['edificio', 225],
};
const estiloTema = (t) => ESTILO_TEMA[t] ?? ['documento', 225];

// ---------------------------------------------------------------------------
// Una norma

const VEREDICTOS = {
  aplica: ['alta', 'Aplica a SYS'],
  dudoso: ['rev', 'Aplicabilidad a evaluar'],
  no_aplica: ['nada', 'Sin impacto identificado'],
};

/** El resumen de la IA: veredicto, qué cambia, cómo le afecta y qué hacer. Va marcado como IA. */
function enPocasPalabras(h) {
  const ia = h.resumenIa;
  if (!ia) return '';
  const [clase, texto] = VEREDICTOS[ia.veredicto] ?? [];
  return [
    `<div class="ia"><b>${icono('chispa')} Síntesis${texto ? ` <span class="pill ${clase}">${texto}</span>` : ''}</b>`,
    `<p>${esc(ia.queCambia)}</p><p>${esc(ia.comoAfecta)}</p>`,
    ia.queHacer ? `<div class="hacer">${icono('check')}<div><strong>Qué hacer:</strong> ${esc(ia.queHacer)}</div></div>` : '',
    '<span class="chico">Síntesis generada automáticamente. Verificar con el texto oficial.</span></div>',
  ].join('');
}

const botonNorma = (h) => `<div class="acciones"><a class="boton" href="${esc(h.url)}" target="_blank" rel="noopener">Ver la norma completa ${icono('externo')}</a></div>`;

/** Lo que sale textual de la norma, más el porqué de que apareció. */
function explicacion(h) {
  const bloque = (ic, titulo, html) => `<div class="bloque"><b>${icono(ic)} ${titulo}</b>${html}</div>`;
  return [
    '<div class="bloques">',
    bloque('documento', 'Texto de la disposición', `<p>${esc(h.queCambia)}</p>`),
    h.paraQue ? bloque('flecha', 'Fundamentos', `<p>${esc(h.paraQue)}</p>`) : '',
    bloque('billetera', 'Alcance para SYS', h.comoAfecta.map((p) => `<p>${esc(p)}</p>`).join('')),
    h.fechasClave.length ? bloque('calendario', 'Fechas clave', `<ul>${h.fechasClave.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`) : '',
    h.dondeNombraASys ? bloque('lupa', 'Mención a la actividad de SYS', `<blockquote>${esc(h.dondeNombraASys)}</blockquote>`) : '',
    h.relacionadas.length
      ? bloque('enlace', 'Normas relacionadas', `<ul>${h.relacionadas.map((e) => `<li><a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.texto)}</a>${e.detalle ? `: ${esc(e.detalle)}` : ''}</li>`).join('')}</ul>`)
      : '',
    bloque('ojo', 'Criterios de detección', `<p class="chico">${esc(h.evaluacion.motivos.join(', '))}.</p>`),
    '</div>',
  ].join('');
}

function etiquetas(h) {
  return `<div class="etiquetas"><span class="etiqueta nivel">${icono(esAlta(h) ? 'alerta' : 'ojo')} ${esAlta(h) ? 'Le afecta' : 'Para revisar'}</span><span class="etiqueta tema" style="--h:${estiloTema(h.tema)[1]}">${esc(TEMAS[h.tema])}</span><span class="etiqueta">${esc(h.tipo)}</span></div>`;
}

function iconoTema(h) {
  const [ic, tono] = estiloTema(h.tema);
  return `<div class="icono-tema" style="--h:${tono}">${icono(ic)}</div>`;
}

function meta(h) {
  return `${h.asunto ? `<span class="asunto">${esc(h.asunto)}</span><br>` : ''}${esc(h.emisor)} · ${esc(h.fecha)}`;
}

/**
 * Arriba lo que hay que saber (resumen, veredicto y qué hacer) y el link; el
 * texto de la norma, plegado. Sin resumen de IA, la explicación textual va a la vista.
 */
function tarjeta(h) {
  const cabeza = `<div class="cabeza">${iconoTema(h)}<div>${etiquetas(h)}<h3>${esc(h.titulo)}</h3><div class="meta">${meta(h)}</div></div></div>`;
  const generico = `<div class="hacer">${icono('check')}<div><strong>Qué hacer:</strong> ${esc(h.queHacer)}</div></div>`;
  const cuerpo = h.resumenIa
    ? `${enPocasPalabras(h)}${botonNorma(h)}<details><summary>Ver detalle de la norma</summary>${explicacion(h)}</details>`
    : esAlta(h)
      ? `${explicacion(h)}${generico}${botonNorma(h)}`
      : `<p class="resumen-corto">${esc(h.comoAfecta[0])}</p>${botonNorma(h)}<details><summary>Ver detalle de la norma</summary>${explicacion(h)}</details>`;
  return `<article class="tarjeta ${esAlta(h) ? 'alta' : 'revisar'}">${cabeza}${cuerpo}</article>`;
}

/** Lo que la IA revisó y no aplica: una línea por norma, al final y plegado. */
function descartadas(lista) {
  if (!lista.length) return '';
  const items = lista.map((h) => `<li><a href="${esc(h.url)}" target="_blank" rel="noopener">${esc(h.titulo)}</a> <span class="chico">— ${esc(h.resumenIa?.comoAfecta ?? '')}</span></li>`);
  return `<details class="caja descartadas"><summary>${plural(lista.length, 'norma analizada sin impacto', 'normas analizadas sin impacto')} para SYS</summary><p class="chico">Normas vinculadas a la actividad de SYS que, analizadas, no requieren acciones. Se listan como referencia.</p><ul>${items.join('')}</ul></details>`;
}

// ---------------------------------------------------------------------------
// Un informe (último o de un día elegido)

function fuentesRevisadas(r) {
  const fallo = (nombre) => r.errores.some((e) => e.toLowerCase().startsWith(nombre));
  const reviso = (nombre) => r.errores.concat(r.revisado).some((e) => e.toLowerCase().startsWith(nombre));
  // Los informes armados hacia atrás no pudieron mirar los textos ordenados.
  const sinTextos = r.revisado.some((x) => x.includes('se vigilan desde'));
  const f = [
    ['Boletín Oficial', fallo('boletín oficial')],
    // Las fuentes que se sumaron después solo aparecen en los informes que las incluyen.
    ...(reviso('boletín de córdoba') ? [['Boletín de Córdoba', fallo('boletín de córdoba')]] : []),
    ...(reviso('rentas córdoba') ? [['Rentas Córdoba', fallo('rentas córdoba')]] : []),
    ['Comunicaciones del BCRA', fallo('bcra "')],
    ...(sinTextos ? [] : [['Textos ordenados', fallo('texto ordenado')]]),
    ...(reviso('prensa del bcra') ? [['Prensa del BCRA', fallo('prensa del bcra')]] : []),
  ];
  const chips = f.map(([n, mal]) => `<span class="fuente${mal ? ' mal' : ''}">${icono(mal ? 'cruz' : 'check')} ${n}</span>`);
  if (sinTextos) chips.push(`<span class="fuente neutra">${icono('reloj')} Textos ordenados: monitoreados desde el 03/10/2026</span>`);
  return `<div class="fuentes">${chips.join('')}</div>`;
}

function informe(r, sobreTitulo) {
  const altas = r.hallazgos.filter(esAlta);
  const rev = r.hallazgos.filter(esRevisar);
  const desc = r.hallazgos.filter((h) => h.evaluacion.nivel === 'descartada');
  const cifra = (clase, n, l, d, destino) =>
    `<${destino ? `a href="${destino}"` : 'div'} class="cifra ${clase}"><div class="n">${n}</div><div class="l">${l}</div><div class="d">${d}</div></${destino ? 'a' : 'div'}>`;
  const c = [
    `<div class="sobre-titulo">${sobreTitulo}</div>`,
    `<h1>${esc(fechaLarga(r.fecha).replace(/^./, (l) => l.toUpperCase()))}</h1>`,
    '<div class="tablero">',
    cifra(altas.length ? 'alta' : 'cero', altas.length, altas.length === 1 ? 'Le afecta a SYS' : 'Le afectan a SYS', altas.length ? 'Requieren análisis de Compliance' : 'Sin novedades', altas.length ? '#bloque-alta' : ''),
    cifra(rev.length ? 'rev' : 'cero', rev.length, 'Para revisar', rev.length ? 'Aplicabilidad a evaluar' : 'Sin novedades', rev.length ? '#bloque-rev' : ''),
    r.errores.length
      ? cifra('mal', icono('alerta'), plural(r.errores.length, 'fuente no disponible', 'fuentes no disponibles'), 'Verificar manualmente', '#fallaron')
      : cifra('ok', icono('check'), 'Fuentes verificadas', 'Todas las fuentes disponibles', ''),
    '</div>',
    fuentesRevisadas(r),
  ];
  if (r.errores.length) {
    c.push(`<div class="aviso" id="fallaron">${icono('alerta')}<div>Una o más fuentes no estuvieron disponibles. Se recomienda verificarlas manualmente; la próxima actualización volverá a consultarlas.<ul>${r.errores.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div></div>`);
  }
  if (!altas.length && !rev.length) {
    c.push(`<div class="tranquilo">${icono('check')}<div><b>${r.errores.length ? 'Sin novedades en las fuentes disponibles' : 'Sin novedades'}</b>${r.errores.length ? 'Las fuentes consultadas no publicaron normas con impacto para SYS.' : 'No se publicaron normas con impacto para SYS.'}</div></div>`);
  }
  if (altas.length) c.push(`<h2 class="alta" id="bloque-alta">Le afecta a SYS <span class="cuenta">${altas.length}</span></h2>`, '<p class="bajada">Normas con impacto en la operatoria o las obligaciones de SYS.</p>', ...altas.map(tarjeta));
  if (rev.length) c.push(`<h2 class="revisar" id="bloque-rev">Para revisar <span class="cuenta">${rev.length}</span></h2>`, '<p class="bajada">Normas vinculadas a la actividad de SYS cuya aplicabilidad requiere evaluación.</p>', ...rev.map(tarjeta));
  c.push(descartadas(desc));
  c.push(
    '<details class="caja revisado"><summary>Fuentes consultadas</summary>',
    `<ul>${r.revisado.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`,
    `<p class="chico">Actualizado el ${esc(r.generado)} (hora de Argentina).</p></details>`,
  );
  return c.join('');
}

// ---------------------------------------------------------------------------
// Pestañas

function vistaUltimo() {
  if (!DIAS.length) return '<p class="vacio">Todavía no hay informes.</p>';
  return informe(DIAS[0], 'Último informe');
}

function vistaDias() {
  if (!DIAS.length) return '<p class="vacio">Todavía no hay informes.</p>';
  const items = DIAS.map((r) => {
    const f = partesFecha(r.fecha);
    const a = r.hallazgos.filter(esAlta).length;
    const rev = r.hallazgos.filter(esRevisar).length;
    const pills = [
      a ? `<span class="pill alta">${plural(a, 'le afecta', 'le afectan')}</span>` : '',
      rev ? `<span class="pill rev">${rev} para revisar</span>` : '',
      !a && !rev ? '<span class="pill nada">Sin novedades</span>' : '',
      r.errores.length ? `<span class="pill alta">⚠ ${plural(r.errores.length, 'fuente no disponible', 'fuentes no disponibles')}</span>` : '<span class="pill ok">✓ Fuentes verificadas</span>',
    ].join('');
    return `<a class="dia ${a ? 'con-alta' : rev ? 'con-rev' : ''}" href="#dia/${r.fecha}"><div class="fecha"><b>${f.d}</b><span>${MESES[f.m - 1].slice(0, 3)}</span></div><div class="que"><b>${esc(f.dia)}</b><div class="pills">${pills}</div></div><span class="ir">›</span></a>`;
  });
  return ['<div class="sobre-titulo">Historial</div>', '<h1>Informes por día</h1>', '<p class="bajada">Un informe por día hábil. Seleccione un día para ver el detalle.</p>', `<div class="linea-tiempo">${items.join('')}</div>`].join('');
}

function vistaDia(fecha) {
  const r = DIAS.find((d) => d.fecha === fecha);
  const volver = `<a class="volver" href="#dias">‹ Volver al historial</a>`;
  if (!r) return `<p class="vacio">No hay informe de ese día.</p><p>${volver}</p>`;
  return `<p>${volver}</p>${informe(r, 'Informe del día')}`;
}

function vistaAyuda() {
  return document.getElementById('ayuda').innerHTML;
}

// ---------------------------------------------------------------------------
// Navegación por "#": cada pestaña tiene su dirección y anda el botón Atrás.

function mostrar() {
  const hash = location.hash.slice(1) || 'ultimo';
  const [ruta, arg] = hash.split('/');
  // Los saltos dentro de un informe (#bloque-alta, #fallaron) no cambian de pestaña.
  if (document.getElementById(ruta) && !['ultimo', 'dias', 'ayuda', 'dia'].includes(ruta)) return;
  const pestana = ruta === 'dia' ? 'dias' : ruta;
  const vistas = { ultimo: vistaUltimo, dias: vistaDias, ayuda: vistaAyuda };
  vista.innerHTML = ruta === 'dia' ? vistaDia(arg) : (vistas[pestana] ?? vistaUltimo)();
  // Reinicia la animación de entrada en cada cambio de pestaña.
  vista.style.animation = 'none';
  void vista.offsetWidth;
  vista.style.animation = '';
  ponerIconos(vista);
  document.querySelectorAll('.pestanas a').forEach((a) => a.setAttribute('aria-selected', String(a.getAttribute('href') === `#${vistas[pestana] ? pestana : 'ultimo'}`)));
  window.scrollTo(0, 0);
}

/** Pone los iconos donde el HTML solo trae el nombre (encabezado, pestañas, guía). */
function ponerIconos(raiz) {
  raiz.querySelectorAll('[data-icono]').forEach((el) => {
    el.insertAdjacentHTML('afterbegin', icono(el.dataset.icono));
    el.removeAttribute('data-icono');
  });
}

ponerIconos(document);
window.addEventListener('hashchange', mostrar);
const textoActualizado = `Actualizado ${DATOS.generado}`;
document.getElementById('actualizado').insertAdjacentText('beforeend', textoActualizado);
document.getElementById('actualizado-movil').textContent = `${textoActualizado} (hora de Argentina)`;
mostrar();
