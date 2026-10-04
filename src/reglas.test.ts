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

// Ruido real del historial (22/9 al 2/10/2026) que no tiene que llegar a la página.

test('Com. B de tasas de referencia de garantía de depósitos -> descartada', () => {
  const ev = evaluar('BANCO CENTRAL DE LA REPÚBLICA ARGENTINA', 'A LAS ENTIDADES FINANCIERAS: Circular OPASI 2 – Garantía de los depósitos – Tasas de referencia.');
  assert.equal(ev.nivel, 'descartada');
});

test('edicto que archiva un sumario cambiario -> descartada', () => {
  const ev = evaluar('BANCO CENTRAL DE LA REPÚBLICA ARGENTINA', 'El BCRA dispuso dejar sin efecto la imputación y archivar el Sumario Cambiario N° 7812 ... proveedores de servicios de pago');
  assert.equal(ev.nivel, 'descartada');
});

test('designación de personal -> descartada aunque toque un tema de SYS', () => {
  const ev = evaluar('MINISTERIO DE ECONOMÍA', 'activos virtuales ... RESUELVE: ARTÍCULO 1°.- Desígnanse miembros titulares y suplentes del Comité de Administración');
  assert.equal(ev.nivel, 'descartada');
});

test('"se paga con VEP o QR" no cuenta como tema de pagos QR', () => {
  const ev = evaluar('ENTE NACIONAL REGULADOR DE LA ELECTRICIDAD', 'cuarta cuota de la Tasa de Fiscalización ... abonarse mediante e-Recauda con VEP o QR ... entidades financieras');
  assert.equal(ev.nivel, 'descartada');
});

test('CNV con solo "entidades financieras" -> descartada', () => {
  assert.equal(evaluar('COMISIÓN NACIONAL DE VALORES', 'colocación primaria de valores negociables ... entidades financieras').nivel, 'descartada');
});

test('UIF con términos débiles -> para revisar (sus normas valen para todos los sujetos obligados)', () => {
  assert.equal(evaluar('UNIDAD DE INFORMACIÓN FINANCIERA', 'Los sujetos obligados deberán ... entidades financieras').nivel, 'revisar');
});

test('UIF: la IA no puede esconder sus normas (cuentan como "nombra a SYS")', () => {
  assert.equal(evaluar('UNIDAD DE INFORMACIÓN FINANCIERA', 'Los sujetos obligados ... entidades financieras').fuerte, true);
  assert.equal(evaluar('COMISIÓN NACIONAL DE VALORES', 'sujetos obligados ... activos virtuales ... entidades financieras').fuerte, false);
});

// Huecos encontrados por `npm run estudio` (Boletín de julio a septiembre de 2026).

test('"PSP/courier" (prestadores de servicios postales, RG ARCA 5884/2026) no es un proveedor de pagos', () => {
  const ev = evaluar('AGENCIA DE RECAUDACIÓN Y CONTROL ADUANERO', 'Régimen de importación por Prestadores de Servicios Postales PSP/Courier, con el objeto de simplificar el proceso');
  assert.equal(ev.nivel, 'descartada');
});

test('"cancelar mediante transferencia electrónica de fondos" (RG ARCA 5896/2026) no es tema de SYS', () => {
  const ev = evaluar('AGENCIA DE RECAUDACIÓN Y CONTROL ADUANERO', 'las cuotas deberán cancelarse mediante transferencia electrónica de fondos ... planes de facilidades de pago ... retenciones');
  assert.equal(ev.nivel, 'descartada');
});

test('un DNI terminado en 327.739 no es la Ley 27.739 (aviso de la Aduana de Posadas)', () => {
  const ev = evaluar('AGENCIA DE RECAUDACIÓN Y CONTROL ADUANERO - ADUANA POSADAS', 'RAMIREZ JAVIER JOSUE DNI 35.327.739 ... sujetos obligados');
  assert.equal(ev.nivel, 'descartada');
});

test('la Ley 27.739 citada en los considerandos ya no alcanza para "Le afecta"', () => {
  const ev = evaluar('MINISTERIO DE JUSTICIA', 'Que mediante la Ley N° 27.739 se incorporó a la Ley N° 25.246 la definición de activos virtuales');
  assert.notEqual(ev.nivel, 'alta');
  assert.equal(ev.fuerte, false);
});

test('las transferencias inmediatas siguen siendo tema de SYS', () => {
  assert.equal(evaluar('', 'transferencias inmediatas ... proveedores de servicios de pago').fuerte, true);
});
