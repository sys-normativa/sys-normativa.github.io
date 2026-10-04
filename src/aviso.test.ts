import assert from 'node:assert/strict';
import { test } from 'node:test';
import { armarAviso } from './aviso.js';
import type { Hallazgo } from './explicar.js';
import { claveComunicacion } from './procesar.js';

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
