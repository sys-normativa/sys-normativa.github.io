// La explicación sale de recortes de la norma: estos casos usan textos reales.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  cartaBcra,
  cartaDirecta,
  comunicacionesCitadas,
  destinatariosLegibles,
  fechasClave,
  paraQue,
  primerArticulo,
  parteDispositiva,
  temaDeComunicacion,
  tipoComunicacion,
} from './explicar.js';
import { parsearEncabezado } from './fuentes/bcraComunicaciones.js';

const A8488 =
  'COMUNICACIÓN “A” 8488 02/10/2026 A LAS ENTIDADES FINANCIERAS, A LOS PROVEEDORES DE SERVICIOS DE PAGO QUE OFRECEN CUENTAS DE PAGO: Ref.: Circular SINAP 1-256: Proveedores de Servicios de Pago. Actualización. ____ ' +
  'Nos dirigimos a Uds. para hacerles llegar en anexo las hojas que, en reemplazo de las oportunamente provistas, corresponde incorporar en el texto ordenado sobre Proveedores de Servi- cios de Pago en función de las disposiciones divulgadas mediante la Comunicación A 8472. ' +
  'Se recuerda que en la página de esta Institución www.bcra.gob.ar, accediendo a “Sis- tema Financiero”, se encontrarán las modificaciones realizadas con textos resaltados en caracteres especiales (tachado y negrita). ' +
  'Saludamos a Uds. atentamente. BANCO CENTRAL DE LA REPUBLICA ARGENTINA';

test('Com. A 8488: carta sin el párrafo de navegación y con apertura directa', () => {
  const carta = cartaBcra(A8488);
  assert.ok(!/Se recuerda/.test(carta));
  assert.ok(/Proveedores de Servicios de Pago en función/.test(carta), 'une las palabras cortadas');
  assert.match(cartaDirecta(carta), /^El BCRA envía en anexo las hojas/);
  assert.equal(tipoComunicacion(carta, 'A'), 'Actualización del texto ordenado');
});

test('Com. A 8488: cita a la A 8472, que es donde está el cambio de fondo', () => {
  assert.deepEqual(comunicacionesCitadas(cartaBcra(A8488), { tipo: 'A', numero: 8488 }), [{ tipo: 'A', numero: 8472 }]);
});

test('Com. A 8481: lista de comunicaciones citadas con comas e "y"', () => {
  const citadas = comunicacionesCitadas('atento a las disposiciones difundidas por las Comunicaciones A 8330, A 8331, A 8442 y A 8464. Adicionalmente');
  assert.deepEqual(citadas.map((c) => c.numero), [8330, 8331, 8442, 8464]);
});

test('Com. A 8487: la resolución entre comillas y su fecha', () => {
  const carta = cartaBcra(
    'Nos dirigimos a Uds. para comunicarles que esta Institución adoptó la resolución que, en su parte pertinente, dispone: “- Establecer como feriado bancario el 10/11/26 en todo el territorio de la República Argentina.” Saludamos a Uds. atentamente.',
  );
  assert.equal(tipoComunicacion(carta, 'A'), 'Norma nueva');
  assert.equal(fechasClave(carta).length, 1);
});

test('tema por la referencia de la circular', () => {
  const ev = { nivel: 'revisar' as const, puntaje: 5, motivos: [], temas: ['psp' as const] };
  assert.equal(temaDeComunicacion('Circular CAMEX 1-1065: Exterior y cambios. Actualización del texto ordenado.', ev), 'cambios');
  assert.equal(temaDeComunicacion('Circular SINAP 1-256: Proveedores de Servicios de Pago. Actualización.', ev), 'psp');
  assert.equal(temaDeComunicacion('Circular RUNOR 1-1975: Feriado bancario con motivo de la visita de Su Santidad el Papa León XIV.', ev), 'operativo');
  assert.equal(temaDeComunicacion('Circular OTRA 1-1: Algo sin pista.', ev), 'psp');
});

test('destinatarios en minúscula y abreviados', () => {
  assert.equal(
    destinatariosLegibles('A LAS ENTIDADES FINANCIERAS, A LAS CÁMARAS ELECTRÓNICAS DE COMPENSACIÓN, A LOS OPERADORES DE CAMBIO, A LAS REDES DE CAJEROS AUTOMÁTICOS, A LOS ADMINISTRADORES QR', 2),
    'entidades financieras, cámaras electrónicas de compensación y 3 más',
  );
});

test('Res. 400/2026 (BO): artículo 1°, vigencia y sin fechas de normas citadas', () => {
  const texto = [
    'CONSIDERANDO:',
    'Que la Ley N° 27.440 tiene como objetivo mejorar las condiciones de financiamiento de las PyMEs.',
    'Que resulta necesario aclarar el alcance del régimen respecto de las entidades financieras.',
    'Por ello,',
    'EL SECRETARIO DE INDUSTRIA Y COMERCIO',
    'RESUELVE:',
    'ARTÍCULO 1°.- Establécese que las entidades financieras no serán sujetos obligados, conforme la Resolución General N° 4.367 de fecha 19 de diciembre de 2018, a partir del momento en que resulte exigible la emisión de comprobantes.',
    'ARTÍCULO 2°.- La presente medida entrará en vigencia a partir del día de su publicación en el Boletín Oficial.',
  ].join('\n');
  const disp = parteDispositiva(texto);
  assert.match(primerArticulo(disp), /^Establécese que las entidades financieras/);
  assert.deepEqual(fechasClave(disp), ['La presente medida entrará en vigencia a partir del día de su publicación en el Boletín Oficial.']);
  assert.match(paraQue(texto), /^Resulta necesario aclarar/);
});

test('Com. A 8398 (BO 9/2/2026): la fecha clave muestra el plazo de 180 días', () => {
  const [f] = fechasClave(
    '1- Incorporar como sujetos obligados contemplados en el punto 1.1. del texto ordenado sobre Requisitos Mínimos para la Gestión y Control de los Riesgos de Tecnología y Seguridad de la Información a los Proveedores de servicios de pago (PSP) incluidos en el Registro de PSP del Banco Central de la República Argentina, otorgándoles un plazo de 180 (ciento ochenta) días corridos a partir de la divulgación de esta comunicación para su implementación.',
  );
  assert.match(f, /plazo de 180 \(ciento ochenta\) días corridos/);
});

test('carta del BCRA: no se corta cuando nombra al banco en el medio', () => {
  const carta = cartaBcra('Nos dirigimos a Uds. para comunicarles que se incluye a los PSP del Registro de PSP del BANCO CENTRAL DE LA REPÚBLICA ARGENTINA con un plazo. Saludamos a Uds. atentamente.');
  assert.match(carta, /con un plazo\.$/);
});

test('Com. A 8310: destinatarios sin "A LOS" al principio', () => {
  const enc = parsearEncabezado(
    '“Año de la Reconstrucción de la Nación Argentina” COMUNICACIÓN “A” 8310 28/08/2025 ADQUIRENTES DE PAGOS CON TARJETA: Ref.: Circular CONAU 1-1692: R.I. Adquirentes de pagos con tarjeta ____ Nos dirigimos a Uds.',
  );
  assert.equal(enc.fecha, '28/08/2025');
  assert.equal(enc.destinatarios, 'ADQUIRENTES DE PAGOS CON TARJETA');
  assert.match(enc.referencia, /Adquirentes de pagos con tarjeta/);
});

test('Com. A 8488: destinatarios de siempre', () => {
  const enc = parsearEncabezado(A8488);
  assert.match(enc.destinatarios, /^A LAS ENTIDADES FINANCIERAS, A LOS PROVEEDORES DE SERVICIOS DE PAGO/);
});
