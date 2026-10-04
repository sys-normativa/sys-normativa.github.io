// Página única del monitor: pestañas "Último informe", "Todas las normas",
// "Por día" y "Cómo funciona". Los datos vienen embebidos en la página
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

/** "2026-10-02" -> "viernes 2 de octubre de 2026". */
function fechaLarga(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${DIAS_SEMANA[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} de ${MESES[m - 1]} de ${y}`;
}

const esAlta = (h) => h.evaluacion.nivel === 'alta';
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// ---------------------------------------------------------------------------
// Una norma

/** El resumen de la IA, si lo hay. Va marcado como tal: se verifica con la norma. */
function enPocasPalabras(h) {
  if (!h.resumenIa) return '';
  return `<div class="ia"><b>En pocas palabras</b><p>${esc(h.resumenIa.queCambia)}</p><p>${esc(h.resumenIa.comoAfecta)}</p><span class="chico">Resumen automático hecho con IA: puede equivocarse. Lo de abajo sale textual de la norma.</span></div>`;
}

function explicacion(h) {
  const bloque = (titulo, html) => `<div class="bloque"><b>${titulo}</b>${html}</div>`;
  return [
    bloque('Qué cambia', `<p>${esc(h.queCambia)}</p>`),
    h.paraQue ? bloque('Para qué, según la norma', `<p>${esc(h.paraQue)}</p>`) : '',
    bloque('Cómo le afecta a SYS', h.comoAfecta.map((p) => `<p>${esc(p)}</p>`).join('')),
    h.fechasClave.length ? bloque('Fechas clave', `<ul>${h.fechasClave.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`) : '',
    h.dondeNombraASys ? bloque('Dónde nombra a SYS', `<blockquote>${esc(h.dondeNombraASys)}</blockquote>`) : '',
    h.relacionadas.length
      ? bloque('Normas relacionadas', `<ul>${h.relacionadas.map((e) => `<li><a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.texto)}</a>${e.detalle ? `: ${esc(e.detalle)}` : ''}</li>`).join('')}</ul>`)
      : '',
    `<div class="hacer"><strong>Qué hacer:</strong> ${esc(h.queHacer)}</div>`,
    `<div class="acciones"><a class="boton" href="${esc(h.url)}" target="_blank" rel="noopener">Ver la norma completa ↗</a></div>`,
    `<details><summary>Por qué apareció</summary><p class="chico">${esc(h.evaluacion.motivos.join(', '))}.</p></details>`,
  ].join('');
}

function etiquetas(h) {
  return `<div class="etiquetas"><span class="etiqueta nivel">${esAlta(h) ? 'Le afecta' : 'Para revisar'}</span><span class="etiqueta">${esc(TEMAS[h.tema])}</span><span class="etiqueta">${esc(h.tipo)}</span></div>`;
}

function meta(h) {
  return `${h.asunto ? `${esc(h.asunto)}<br>` : ''}${esc(h.emisor)} · ${esc(h.fecha)}`;
}

/** Tarjeta completa: las "Le afecta" abiertas; las "Para revisar", con la explicación plegada. */
function tarjeta(h) {
  const cuerpo = esAlta(h)
    ? enPocasPalabras(h) + explicacion(h)
    : `${enPocasPalabras(h) || `<p>${esc(h.comoAfecta[0])}</p>`}<details><summary>Ver la explicación completa</summary>${explicacion(h)}</details>`;
  return `<article class="tarjeta ${esAlta(h) ? 'alta' : 'revisar'}">${etiquetas(h)}<h3>${esc(h.titulo)}</h3><div class="meta">${meta(h)}</div>${cuerpo}</article>`;
}

/** Renglón plegable para la lista larga. */
function fila(h) {
  return `<details class="fila ${esAlta(h) ? 'alta' : 'revisar'}"><summary>${etiquetas(h)}<span class="t">${esc(h.titulo)}</span><span class="s">${h.asunto ? esc(h.asunto) + ' · ' : ''}${esc(h.emisor)} · informe del ${esc(fechaLarga(h.dia))}</span></summary><div class="cuerpo"><div class="tarjeta">${enPocasPalabras(h)}${explicacion(h)}</div></div></details>`;
}

// ---------------------------------------------------------------------------
// Un informe (último o de un día elegido)

function informe(r, titulo) {
  const altas = r.hallazgos.filter(esAlta);
  const rev = r.hallazgos.filter((h) => !esAlta(h));
  const c = [
    `<h1>${titulo}</h1>`,
    '<div class="resumen">',
    altas.length ? `<span class="pastilla p-alta">${plural(altas.length, 'le afecta', 'le afectan')}</span>` : '<span class="pastilla p-nada">Nada que le afecte</span>',
    rev.length ? `<span class="pastilla p-rev">${rev.length} para revisar</span>` : '',
    r.errores.length ? `<span class="pastilla p-alta">⚠ ${plural(r.errores.length, 'fuente falló', 'fuentes fallaron')}</span>` : '<span class="pastilla p-ok">✓ Se revisaron todas las fuentes</span>',
    '</div>',
  ];
  if (r.errores.length) {
    c.push(`<div class="aviso">⚠ No se pudieron revisar todas las fuentes. Lo que no se revisó puede tener novedades: hay que mirarlo a mano.<ul>${r.errores.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>`);
  }
  if (!altas.length && !rev.length) {
    c.push(`<div class="caja">${r.errores.length ? 'En las fuentes que sí se pudieron revisar no apareció nada que afecte a SYS.' : 'No apareció nada que afecte a SYS. No hay que hacer nada.'}</div>`);
  }
  if (altas.length) c.push(`<h2>Le afecta a SYS <small>(${altas.length})</small></h2>`, '<p class="bajada">Nombran a SYS o a su actividad. Las tiene que ver compliance.</p>', ...altas.map(tarjeta));
  if (rev.length) c.push(`<h2>Para revisar <small>(${rev.length})</small></h2>`, '<p class="bajada">Tocan temas de SYS, pero puede que no le apliquen. Alcanza con una mirada rápida.</p>', ...rev.map(tarjeta));
  c.push(
    '<details class="caja"><summary>Qué se revisó</summary>',
    `<ul>${r.revisado.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`,
    `<p class="chico">Revisión hecha el ${esc(r.generado)} (hora de Argentina).</p></details>`,
  );
  return c.join('');
}

// ---------------------------------------------------------------------------
// Pestañas

function vistaUltimo() {
  if (!DIAS.length) return '<p class="vacio">Todavía no hay informes.</p>';
  return informe(DIAS[0], `Último informe: ${esc(fechaLarga(DIAS[0].fecha))}`);
}

const TODAS = DIAS.flatMap((d) => d.hallazgos.map((h) => ({ ...h, dia: d.fecha })));
const filtro = { nivel: 'todas', tema: '', texto: '' };

function sinTildes(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function listaFiltrada() {
  const q = sinTildes(filtro.texto.trim());
  return TODAS.filter(
    (h) =>
      (filtro.nivel === 'todas' || h.evaluacion.nivel === filtro.nivel) &&
      (!filtro.tema || h.tema === filtro.tema) &&
      (!q || sinTildes([h.titulo, h.asunto, h.emisor, h.queCambia, h.comoAfecta.join(' ')].join(' ')).includes(q)),
  );
}

function pintarLista() {
  const l = listaFiltrada();
  document.getElementById('cuenta').textContent = `${plural(l.length, 'norma', 'normas')}`;
  document.getElementById('lista').innerHTML = l.length ? l.map(fila).join('') : '<p class="vacio">No hay normas con estos filtros.</p>';
}

function vistaTodas() {
  const temasUsados = [...new Set(TODAS.map((h) => h.tema))].sort((a, b) => TEMAS[a].localeCompare(TEMAS[b]));
  const boton = (valor, texto) => `<button type="button" data-nivel="${valor}" aria-pressed="${filtro.nivel === valor}">${texto}</button>`;
  return [
    '<h1>Todas las normas</h1>',
    '<p class="bajada">Todo lo que encontró el monitor, de lo más nuevo a lo más viejo. Tocá una norma para ver la explicación.</p>',
    '<div class="filtros">',
    boton('todas', 'Todas'),
    boton('alta', 'Le afecta'),
    boton('revisar', 'Para revisar'),
    `<select id="tema" aria-label="Tema"><option value="">Todos los temas</option>${temasUsados.map((t) => `<option value="${t}"${filtro.tema === t ? ' selected' : ''}>${esc(TEMAS[t])}</option>`).join('')}</select>`,
    `<input id="buscar" type="search" placeholder="Buscar (ej.: UIF, 8488, QR)" value="${esc(filtro.texto)}" aria-label="Buscar">`,
    '</div>',
    '<p class="chico" id="cuenta"></p>',
    '<div id="lista"></div>',
  ].join('');
}

function prepararTodas() {
  vista.querySelectorAll('[data-nivel]').forEach((b) =>
    b.addEventListener('click', () => {
      filtro.nivel = b.dataset.nivel;
      vista.querySelectorAll('[data-nivel]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      pintarLista();
    }),
  );
  document.getElementById('tema').addEventListener('change', (e) => {
    filtro.tema = e.target.value;
    pintarLista();
  });
  document.getElementById('buscar').addEventListener('input', (e) => {
    filtro.texto = e.target.value;
    pintarLista();
  });
  pintarLista();
}

function vistaDias() {
  if (!DIAS.length) return '<p class="vacio">Todavía no hay informes.</p>';
  const filas = DIAS.map((r) => {
    const a = r.hallazgos.filter(esAlta).length;
    const rev = r.hallazgos.length - a;
    return `<tr data-dia="${r.fecha}"><td><a href="#dia/${r.fecha}">${esc(fechaLarga(r.fecha))}</a></td><td class="n">${a ? `<span class="pastilla p-alta">${a}</span>` : '—'}</td><td class="n">${rev || '—'}</td><td class="n">${r.errores.length ? '<span class="pastilla p-alta">⚠</span>' : '<span class="pastilla p-ok">✓</span>'}</td></tr>`;
  });
  return [
    '<h1>Informes por día</h1>',
    '<p class="bajada">Un informe por cada día revisado. Tocá un día para verlo completo.</p>',
    '<table><thead><tr><th>Día</th><th>Le afecta</th><th>Para revisar</th><th>Fuentes</th></tr></thead><tbody>',
    ...filas,
    '</tbody></table>',
  ].join('');
}

function prepararDias() {
  vista.querySelectorAll('tr[data-dia]').forEach((tr) => tr.addEventListener('click', () => (location.hash = `dia/${tr.dataset.dia}`)));
}

function vistaDia(fecha) {
  const r = DIAS.find((d) => d.fecha === fecha);
  if (!r) return '<p class="vacio">No hay informe de ese día.</p><p><a href="#dias">← Volver a la lista de días</a></p>';
  return `<p><a href="#dias">← Volver a la lista de días</a></p>${informe(r, `Informe del ${esc(fechaLarga(fecha))}`)}`;
}

function vistaAyuda() {
  return document.getElementById('ayuda').innerHTML;
}

// ---------------------------------------------------------------------------
// Navegación por "#": cada pestaña tiene su dirección y anda el botón Atrás.

function mostrar() {
  const hash = location.hash.slice(1) || 'ultimo';
  const [ruta, arg] = hash.split('/');
  const pestana = ruta === 'dia' ? 'dias' : ruta;
  const vistas = { ultimo: vistaUltimo, normas: vistaTodas, dias: vistaDias, ayuda: vistaAyuda };
  vista.innerHTML = ruta === 'dia' ? vistaDia(arg) : (vistas[pestana] ?? vistaUltimo)();
  if (pestana === 'normas') prepararTodas();
  if (ruta === 'dias') prepararDias();
  document.querySelectorAll('.pestanas a').forEach((a) => a.setAttribute('aria-selected', String(a.getAttribute('href') === `#${vistas[pestana] ? pestana : 'ultimo'}`)));
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', mostrar);
document.getElementById('actualizado').textContent = `Última revisión: ${DATOS.generado} (hora de Argentina)`;
mostrar();
