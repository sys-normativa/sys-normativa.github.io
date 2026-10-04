// Las fuentes de Rentas Córdoba y de prensa del BCRA, con recortes reales de sus páginas.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fechaDeNoticia, parsearListado } from './fuentes/bcraPrensa.js';
import { fechaArgentina, parsearFeed } from './fuentes/rentasCordoba.js';
import { claveCordoba } from './procesar.js';
import { evaluar } from './reglas.js';

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

// Entrada real del feed de Rentas Córdoba (22/9/2026), recortada.
const FEED = `<rss><channel><item>
<title>Resolución SIP N° 19/2026 Letra D &#8211; Baja de Agentes de Retención y Percepción de Ingresos Brutos</title>
<link>https://www.rentascordoba.gob.ar/cms/resolucion-sip-n-19-2026-letra-d/</link>
<pubDate>Tue, 22 Sep 2026 11:10:28 +0000</pubDate>
<category><![CDATA[Novedades]]></category>
<category><![CDATA[Resoluciones SIP]]></category>
<guid isPermaLink="false">https://www.rentascordoba.gob.ar/cms/?p=101422</guid>
<description><![CDATA[<p>Fecha de Publicación 22/09/2026</p> <p>Da de baja de la nómina de agentes de retención y percepción a Avex S.A. La vigencia es desde la publicación en el boletín oficial.</p> <p>La entrada <a href="https://x">Resolución SIP</a> se publicó primero en <a href="https://x">Rentas Córdoba</a>.</p>]]></description>
<content:encoded><![CDATA[<p>Texto completo.</p>]]></content:encoded>
</item><item>
<title>Acreditación de inversión</title><link>https://x/guia/</link><pubDate>Mon, 14 Sep 2026 10:00:00 +0000</pubDate>
<category><![CDATA[Gestiones CMS]]></category><category><![CDATA[Guía Trámite]]></category><guid>https://x/?p=1</guid>
</item></channel></rss>`;

test('Rentas Córdoba: lee la norma del feed y saltea las guías de trámites', () => {
  const normas = parsearFeed(FEED);
  assert.equal(normas.length, 1);
  const [n] = normas;
  assert.equal(n.id, 'p=101422');
  assert.equal(n.fecha, '2026-09-22');
  assert.equal(n.titulo, 'Resolución SIP N° 19/2026 Letra D – Baja de Agentes de Retención y Percepción de Ingresos Brutos');
  assert.match(n.resumen, /Da de baja de la nómina/);
  assert.doesNotMatch(n.resumen, /se publicó primero/);
});

test('Rentas Córdoba: la fecha se toma en hora argentina', () => {
  // 01:30 UTC del 1/10 son las 22:30 del 30/9 en Argentina.
  assert.equal(fechaArgentina('Thu, 01 Oct 2026 01:30:00 +0000'), '2026-09-30');
});

test('la misma norma de Córdoba por el Boletín o por Rentas no se repite', () => {
  const boletin = claveCordoba({ titulo: 'Resolución General N° 2229', fuente: 'Boletín Oficial de Córdoba', emisor: 'Dirección General de Rentas (Córdoba)' });
  const rentas = claveCordoba({ titulo: 'Resolución General N° 2229/2026 – Padrón de Octubre de 2026', fuente: 'Rentas Córdoba', emisor: 'Rentas Córdoba (Ingresos Brutos de Córdoba)' });
  assert.equal(boletin, 'cba-rg-2229');
  assert.equal(rentas, boletin);
  const sipBoletin = claveCordoba({ titulo: 'Resolución N° 19 - Letra:D', fuente: 'Boletín Oficial de Córdoba', emisor: 'Secretaría de Ingresos Públicos (Córdoba)' });
  const sipRentas = claveCordoba({ titulo: 'Resolución SIP N° 19/2026 Letra D – Baja de Agentes', fuente: 'Rentas Córdoba', emisor: 'Rentas Córdoba (Ingresos Brutos de Córdoba)' });
  assert.equal(sipBoletin, 'cba-sip-19');
  assert.equal(sipRentas, sipBoletin);
  assert.equal(claveCordoba({ titulo: 'Resolución General N° 2229', fuente: 'Boletín Oficial', emisor: 'ARCA' }), null);
});
