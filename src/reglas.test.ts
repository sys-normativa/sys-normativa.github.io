// Casos tomados de normas reales que el filtro tiene que encontrar (o descartar).

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dirigidaAPsp, evaluar } from './reglas.js';

test('UIF 200/2024: PSP como sujetos obligados -> alta', () => {
  const ev = evaluar(
    'UNIDAD DE INFORMACIÓN FINANCIERA',
    'Emisores, operadores y proveedores de servicios de cobros y/o pagos ... Ley N° 27.739 ... cuentas de pago',
  );
  assert.equal(ev.nivel, 'alta');
});

test('Decreto 475/2026: impuesto al cheque -> alta', () => {
  const ev = evaluar('PODER EJECUTIVO', 'Ley de Competitividad N° 25.413 ... proveedores de servicios de activos virtuales');
  assert.equal(ev.nivel, 'alta');
});

test('muchos términos débiles sin nada propio de SYS no llegan a alta', () => {
  const ev = evaluar('MINISTERIO DE ECONOMÍA', 'entidades financieras ... sujetos obligados ... retenciones ... régimen de información');
  assert.notEqual(ev.nivel, 'alta');
});

test('citación a sumario del BCRA -> descartada aunque nombre a un PSP', () => {
  const ev = evaluar(
    'BANCO CENTRAL DE LA REPÚBLICA ARGENTINA',
    'El Banco Central de la República Argentina cita y emplaza al representante legal de un proveedor de servicios de pago',
  );
  assert.equal(ev.nivel, 'descartada');
});

test('aviso sin ningún tema de SYS -> descartada', () => {
  const ev = evaluar('ADMINISTRACIÓN NACIONAL DE LA SEGURIDAD SOCIAL', 'Prorrógase el plazo de adhesión al Plan de Retiros');
  assert.equal(ev.nivel, 'descartada');
});

test('destinatarios de la Com. A 8488 incluyen a los PSP', () => {
  assert.ok(dirigidaAPsp('A LAS ENTIDADES FINANCIERAS, A LOS PROVEEDORES DE SERVICIOS DE PAGO QUE OFRECEN CUENTAS DE PAGO'));
  assert.ok(!dirigidaAPsp('A LAS ENTIDADES FINANCIERAS'));
});

test('Com. A 8487: feriado bancario del 10/11/26 -> para revisar, tema operativo', () => {
  const ev = evaluar('', 'A LAS ENTIDADES FINANCIERAS ... dispone: “- Establecer como feriado bancario el 10/11/26 en todo el territorio de la República Argentina.”');
  assert.equal(ev.nivel, 'revisar');
  assert.equal(ev.temas[0], 'operativo');
});

test('RG ARCA 5804/2025: el tema es impuestos aunque nombre a los PSP', () => {
  const ev = evaluar(
    'AGENCIA DE RECAUDACIÓN Y CONTROL ADUANERO',
    'régimen de información ... incluidos los Proveedores de Servicios de Pago (PSP) que ofrecen cuentas de pago ... Clave Virtual Uniforme (CVU)',
  );
  assert.equal(ev.nivel, 'alta');
  assert.equal(ev.temas[0], 'impuestos');
});
