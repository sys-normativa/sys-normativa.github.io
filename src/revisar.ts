// Corrida diaria: revisa todas las fuentes, guarda el informe del día en
// datos/informes/, rearma la página (salida/index.html) y actualiza
// datos/estado.json. Si ya corrió ese día, suma lo nuevo al mismo informe.
//
//   npm run revisar                         -> Boletín Oficial de hoy + novedades del BCRA
//   npm run revisar -- --fecha 2026-10-02   -> Boletín Oficial de ese día
//   npm run revisar -- --bcra-desde A=8480  -> relee el BCRA desde ese número (para probar)
//
// Una fuente que falla no frena a las demás: queda anotada en el informe,
// porque un "hoy no hubo nada" falso es el peor error posible.

import { avisosDelDia } from './fuentes/boletinOficial.js';
import { buscarUltimo, existe, leerComunicacion, nuevasDesde, type TipoCom } from './fuentes/bcraComunicaciones.js';
import { leerEncabezado, TEXTOS_ORDENADOS } from './fuentes/bcraTextosOrdenados.js';
import { dejarAviso } from './aviso.js';
import { guardarEstado, leerEstado } from './estado.js';
import { explicarTextoOrdenado } from './explicar.js';
import { armarMarkdown } from './informe.js';
import { diasEntre, guardarDia, hoyEnArgentina, Lote } from './procesar.js';
import { escribirSitio } from './sitio.js';

function argumento(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const manual = argumento('fecha');
const fecha = manual ?? hoyEnArgentina();
const estado = await leerEstado();
const lote = new Lote();
const revisado: string[] = [];
const errores: string[] = [];
let huboEdicion = true;

// 1. Boletín Oficial: el de hoy, más los días anteriores que no se pudieron
// leer completos (si una corrida falla, la siguiente los recupera). Ayer se
// relee una vez más por si se agregó algo tarde. Lo ya informado no se repite.
const MAX_DIAS_ATRAS = 10;
const ayer = new Date(Date.parse(`${fecha}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
const dias = manual || !estado.boletinHasta ? [fecha] : diasEntre(estado.boletinHasta, fecha).slice(-MAX_DIAS_ATRAS);
// Hasta qué día quedó todo leído: avanza solo por días seguidos sin error, y
// nunca incluye hoy, que se relee en cada corrida.
let completoHasta = estado.boletinHasta ?? ayer;
let seguidos = true;
for (const dia of dias) {
  try {
    const avisos = await avisosDelDia(dia.replaceAll('-', ''));
    lote.avisosBO(avisos, dia);
    if (dia === fecha) huboEdicion = avisos.length > 0;
    const cuando = dia === fecha ? '' : ' (día anterior, vuelto a mirar por si quedó algo)';
    revisado.push(avisos.length ? `Boletín Oficial del ${dia}: ${avisos.length} avisos de la primera sección${cuando}.` : `Boletín Oficial del ${dia}: no hubo edición.`);
    if (dia < fecha && seguidos) completoHasta = dia;
  } catch (e) {
    seguidos = false;
    errores.push(`Boletín Oficial del ${dia}: ${(e as Error).message}`);
  }
}
if (!manual) estado.boletinHasta = completoHasta;

// 2. Comunicaciones del BCRA
const forzado = argumento('bcra-desde');
if (forzado) {
  const [t, n] = forzado.split('=');
  estado.ultimaComunicacion[t as TipoCom] = Number(n) - 1;
}
const DIAS_PENDIENTE = 30;
type Pendiente = { numero: number; desde: string };
estado.pendientes ??= {};
for (const tipo of ['A', 'B', 'C'] as TipoCom[]) {
  try {
    const ultimo = estado.ultimaComunicacion[tipo];
    if (ultimo === undefined) {
      // Primera corrida: se fija el punto de partida sin informar el histórico.
      estado.ultimaComunicacion[tipo] = await buscarUltimo(tipo);
      revisado.push(`BCRA "${tipo}": primera corrida, se arranca desde la ${tipo} ${estado.ultimaComunicacion[tipo]}.`);
      continue;
    }
    // Control: la última leída tiene que seguir en su lugar. Si no está, el
    // BCRA cambió dónde publica y "0 nuevas" sería falso.
    if (!forzado && !(await existe(tipo, ultimo))) {
      throw new Error(`no se encuentra la ${tipo} ${ultimo}, que ya se había leído: el BCRA puede haber cambiado la dirección de sus PDF`);
    }
    // Números salteados en corridas anteriores: ¿se publicaron ahora?
    const pendientes: Pendiente[] = estado.pendientes[tipo] ?? [];
    const siguen: Pendiente[] = [];
    for (const p of pendientes) {
      const c = await leerComunicacion(tipo, p.numero);
      if (c) {
        lote.comunicacion(c);
        revisado.push(`BCRA: apareció la ${tipo} ${p.numero}, que estaba salteada desde el ${p.desde}.`);
      } else if (diasEntre(p.desde, fecha).length < DIAS_PENDIENTE) {
        siguen.push(p);
      }
    }
    const { nuevas, salteados } = await nuevasDesde(tipo, ultimo);
    for (const c of nuevas) {
      lote.comunicacion(c);
      estado.ultimaComunicacion[tipo] = c.numero;
    }
    siguen.push(...salteados.map((numero) => ({ numero, desde: fecha })));
    estado.pendientes[tipo] = siguen;
    revisado.push(
      `BCRA "${tipo}": ${nuevas.length} nuevas (última leída: ${tipo} ${estado.ultimaComunicacion[tipo]})` +
        (siguen.length ? `; se siguen buscando ${siguen.map((p) => `${tipo} ${p.numero}`).join(', ')}, salteadas.` : '.'),
    );
  } catch (e) {
    errores.push(`BCRA "${tipo}": ${(e as Error).message}`);
  }
}

// 3. Textos ordenados del BCRA
let cambiados = 0;
for (const { archivo, tema, temaSys } of TEXTOS_ORDENADOS) {
  try {
    const t = await leerEncabezado(archivo, tema);
    if (!t || !t.ultimaComunicacion) {
      errores.push(`Texto ordenado "${tema}": no se pudo leer la carátula.`);
      continue;
    }
    const antes = estado.textosOrdenados[archivo];
    if (antes && antes !== t.ultimaComunicacion) {
      cambiados++;
      lote.agregar(explicarTextoOrdenado({ ...t, temaSys }, antes, t.ultimaComunicacion));
    }
    estado.textosOrdenados[archivo] = t.ultimaComunicacion;
  } catch (e) {
    errores.push(`Texto ordenado "${tema}": ${(e as Error).message}`);
  }
}
revisado.push(`Textos ordenados del BCRA: ${TEXTOS_ORDENADOS.length} temas, ${cambiados} cambiaron.`);

// 4. Guardar, rearmar la página y dejar el aviso si hay algo nuevo.
const { resumen, nuevos } = await guardarDia(fecha, lote, revisado, errores, { huboEdicion });
await escribirSitio(resumen.generado);
await guardarEstado(estado);
await dejarAviso(fecha, nuevos, errores);

console.log(armarMarkdown(resumen));
console.log(`\n${nuevos.length} normas nuevas en esta corrida. Página del monitor: salida/index.html`);
if (errores.length) process.exitCode = 1;
