import assert from 'node:assert/strict';
import { test } from 'node:test';
import { armarAviso } from './aviso.js';
import { nivelFinal } from './ia.js';
import type { Hallazgo } from './explicar.js';
import { claveComunicacion, diasEntre } from './procesar.js';

const norma = (nivel: 'alta' | 'revisar', titulo: string): Hallazgo => ({
  fuente: 'BCRA', emisor: 'Banco Central (BCRA)', titulo, asunto: '', fecha: '02/10/2026', url: 'https://x', tipo: 'Norma nueva',
  queCambia: '', paraQue: '', tema: 'psp', comoAfecta: ['Le aplica.'], queHacer: '', fechasClave: [], dondeNombraASys: '', relacionadas: [],
  evaluacion: { nivel, puntaje: 5, motivos: [], temas: ['psp'] },
});

test('sin novedades ni errores no hay aviso', () => {
  assert.equal(armarAviso('2026-10-02', [], [], 'https://sitio'), null);
});

test('el título cuenta lo nuevo y el cuerpo menciona al destinatario', () => {
  const a = armarAviso('2026-10-02', [norma('alta', 'Comunicación "A" 8488'), norma('revisar', 'Resolución 400/2026')], ['BCRA "B": HTTP 500'], 'https://sitio');
  assert.equal(a?.titulo, 'Normativa SYS 2/10: 1 le afecta, 1 para revisar, ⚠ 1 fuente falló');
  assert.match(a!.cuerpo, /@Guidoparisi91/);
  assert.match(a!.cuerpo, /\(https:\/\/sitio\)/);
});

test('la misma comunicación por la web del BCRA o por el Boletín Oficial', () => {
  assert.equal(claveComunicacion('Comunicación "A" 8486'), 'A8486');
  assert.equal(claveComunicacion('Comunicación "A" 8486/2026'), 'A8486');
  assert.equal(claveComunicacion('Resolución 400/2026'), null);
});

test('días entre dos fechas, cruzando de mes', () => {
  assert.deepEqual(diasEntre('2026-09-29', '2026-10-02'), ['2026-09-30', '2026-10-01', '2026-10-02']);
  assert.deepEqual(diasEntre('2026-10-02', '2026-10-02'), []);
});

test('nivel final: reglas + veredicto de la IA', () => {
  const con = (nivel: 'alta' | 'revisar', motivos: string[] = [], fuerte = false) => ({ evaluacion: { nivel, puntaje: 5, motivos, temas: [], fuerte } });
  assert.equal(nivelFinal(con('alta', ['dirigida a los proveedores de servicios de pago'], true), 'no_aplica'), 'alta');
  assert.equal(nivelFinal(con('alta', [], true), 'no_aplica'), 'revisar', 'nombra a SYS: la IA no la puede esconder');
  assert.equal(nivelFinal(con('revisar', [], false), 'no_aplica'), 'descartada');
  assert.equal(nivelFinal(con('alta', [], true), 'dudoso'), 'revisar');
  assert.equal(nivelFinal(con('revisar'), 'aplica'), 'alta');
  assert.equal(nivelFinal(con('revisar')), 'revisar', 'sin IA mandan las reglas');
});

test('lo que la IA descartó no genera aviso', () => {
  const desc = norma('revisar', 'Resolución 1/2026');
  desc.evaluacion.nivel = 'descartada';
  assert.equal(armarAviso('2026-10-02', [desc], [], 'https://sitio'), null);
});
