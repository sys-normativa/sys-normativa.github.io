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
import { buscarUltimo, nuevasDesde, type TipoCom } from './fuentes/bcraComunicaciones.js';
import { leerEncabezado, TEXTOS_ORDENADOS } from './fuentes/bcraTextosOrdenados.js';
import { dejarAviso } from './aviso.js';
import { guardarEstado, leerEstado } from './estado.js';
import { explicarTextoOrdenado } from './explicar.js';
import { armarMarkdown } from './informe.js';
import { guardarDia, hoyEnArgentina, Lote } from './procesar.js';
import { escribirSitio } from './sitio.js';

function argumento(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const fecha = argumento('fecha') ?? hoyEnArgentina();
const estado = await leerEstado();
const lote = new Lote();
const revisado: string[] = [];
const errores: string[] = [];
let huboEdicion = true;

// 1. Boletín Oficial
try {
  const avisos = await avisosDelDia(fecha.replaceAll('-', ''));
  lote.avisosBO(avisos, fecha);
  huboEdicion = avisos.length > 0;
  revisado.push(avisos.length ? `Boletín Oficial del ${fecha}: ${avisos.length} avisos de la primera sección.` : `Boletín Oficial del ${fecha}: no hubo edición.`);
} catch (e) {
  errores.push(`Boletín Oficial del ${fecha}: ${(e as Error).message}`);
}

// 2. Comunicaciones del BCRA
const forzado = argumento('bcra-desde');
if (forzado) {
  const [t, n] = forzado.split('=');
  estado.ultimaComunicacion[t as TipoCom] = Number(n) - 1;
}
for (const tipo of ['A', 'B', 'C'] as TipoCom[]) {
  try {
    const ultimo = estado.ultimaComunicacion[tipo];
    if (ultimo === undefined) {
      // Primera corrida: se fija el punto de partida sin informar el histórico.
      estado.ultimaComunicacion[tipo] = await buscarUltimo(tipo);
      revisado.push(`BCRA "${tipo}": primera corrida, se arranca desde la ${tipo} ${estado.ultimaComunicacion[tipo]}.`);
      continue;
    }
    const nuevas = await nuevasDesde(tipo, ultimo);
    for (const c of nuevas) {
      lote.comunicacion(c);
      estado.ultimaComunicacion[tipo] = c.numero;
    }
    revisado.push(`BCRA "${tipo}": ${nuevas.length} nuevas (última leída: ${tipo} ${estado.ultimaComunicacion[tipo]}).`);
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
