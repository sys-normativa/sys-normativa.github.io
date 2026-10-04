// Las fuentes nuevas (Córdoba y prensa del BCRA), con recortes reales de sus páginas.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fechaDeNoticia, parsearListado } from './fuentes/bcraPrensa.js';
import { parsearPrimeraSeccion, reflujo } from './fuentes/boletinCordoba.js';
import { evaluar } from './reglas.js';

// Tapa y sumario del 1/10/2026: la línea del sumario viene pegada al cuerpo.
const PAGINA_1_10 = `SUMARIO
SECCION
LEGISLACIÓN Y
NORMATIVAS
1a1BOLETIN OFICIAL DE LA PROVINCIA DE CORDOBA
2026
Año de los Derechos Humanos por
la Memoria, la Verdad y la Justicia.
JUEVES 1° DE OCTUBRE DE 2026
AÑO CXIII - TOMO DCCXLII - Nº 192
CÓRDOBA, (R.A.)
http://boletinoficial.cba.gov.ar
Email: boe@cba.gov.ar
DIRECCIÓN GENERAL DE CATASTRO
Resolución General N° 30 ..........................................Pag. 1DIRECCIÓN GENERAL DE CATASTRO
Resolución General N° 30
Córdoba, 25 de septiembre 2026.
VISTO el punto 3.4. del Anexo de la Resolución Normativa N° 2/2025 que
establece normas técnicas.
EL DIRECTOR GENERAL DE CATASTRO
RESUELVE:
Artículo 1°. RECTIFICAR los valores aprobados por Resolución Gene-
ral N° 23/2025.`;

test('Córdoba 1/10/2026: separa la norma aunque el sumario venga pegado', () => {
  const [a, ...resto] = parsearPrimeraSeccion([PAGINA_1_10], 'https://x/1_Secc_011026.pdf');
  assert.equal(resto.length, 0);
  assert.equal(a.organismo, 'DIRECCIÓN GENERAL DE CATASTRO');
  assert.equal(a.titulo, 'Resolución General N° 30');
  assert.match(a.texto, /^Córdoba, 25 de septiembre/);
  assert.match(a.texto, /Resolución General N° 23\/2025/, 'une "Gene- ral" partido entre renglones');
  assert.match(a.url, /#page=1&norma=/);
});

test('Córdoba: si una norma del sumario no aparece en el cuerpo, va la sección entera', () => {
  const avisos = parsearPrimeraSeccion([PAGINA_1_10.replace('Resolución General N° 30\nCórdoba', 'Resolucion Gral 30\nCórdoba')], 'https://x/a.pdf');
  assert.equal(avisos.length, 1);
  assert.match(avisos[0].titulo, /no se pudo separar/);
  assert.match(avisos[0].texto, /RECTIFICAR/);
});

test('Córdoba: sin sumario es un error, no "no hubo nada"', () => {
  assert.throws(() => parsearPrimeraSeccion(['texto sin sumario'], 'https://x/a.pdf'), /sumario/);
});

test('reflujo: une renglones y respeta los fines de oración', () => {
  assert.equal(reflujo(['Que se trami-', 'ta el expediente', 'número 5.', 'Por ello:']), 'Que se tramita el expediente número 5.\nPor ello:');
});

test('Rentas Córdoba RG 2229/2026 (padrones IIBB y SIRCUPA) -> le afecta, tema IIBB', () => {
  const ev = evaluar(
    'DIRECCIÓN GENERAL DE RENTAS',
    'APROBAR Y REMITIR a la Comisión Arbitral del Convenio Multilateral el listado ... Impuesto sobre los Ingresos Brutos ... regímenes de retención, percepción y/o recaudación ... SIRCUPA ... cuentas de pago ... proveedores de servicios de pago',
  );
  assert.equal(ev.nivel, 'alta');
  assert.equal(ev.temas[0], 'iibb');
});

const LISTADO = `<article id="post-105483" class="et_pb_post clearfix"> <p class="post-meta"> <span class="published">03 de septiembre de 2026</span> </p> <h2 class="entry-title"> <a href="https://www.bcra.gob.ar/noticias/el-bcra-profundiza-la-estrategia-de-prevencion-del-fraude/">El BCRA profundiza la estrategia de prevención del fraude</a> </h2> <div class="post-categories"> Noticias </div> <div class="post-content"> <div class="post-content-inner"> <p>Desde septiembre, los administradores de transferencias inmediatas contarán con información pública.</p> </div> </div> </article>`;

test('prensa del BCRA: lee id, fecha, título, link y bajada del listado', () => {
  const [n] = parsearListado(LISTADO);
  assert.equal(n.id, 'post-105483');
  assert.equal(n.fecha, '2026-09-03');
  assert.equal(n.titulo, 'El BCRA profundiza la estrategia de prevención del fraude');
  assert.match(n.url, /prevencion-del-fraude\/$/);
  assert.match(n.bajada, /^Desde septiembre/);
});

test('prensa del BCRA: fechas en castellano', () => {
  assert.equal(fechaDeNoticia('jueves, 1 de octubre de 2026'), '2026-10-01');
  assert.equal(fechaDeNoticia('sin fecha'), '');
});
