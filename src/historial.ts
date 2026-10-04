// Arma los informes de días que ya pasaron, como si el monitor hubiera corrido
// ese día: el Boletín Oficial de la fecha, las comunicaciones del BCRA que
// llevan esa fecha, y las normas de Rentas Córdoba y noticias del BCRA de ese día. Sirve para arrancar con historial.
//
//   npm run historial -- 2026-09-29 2026-09-30 2026-10-01 2026-10-02
//
// No toca datos/estado.json: la corrida diaria sigue desde donde estaba.
// Los textos ordenados no se pueden mirar hacia atrás (solo existe su versión
// de hoy), así que esos días no los incluyen y el informe lo aclara.

import { avisosDelDia } from './fuentes/boletinOficial.js';
import { listarRentas, type NormaRentas } from './fuentes/rentasCordoba.js';
import { leerNoticia, listarNoticias, type Noticia } from './fuentes/bcraPrensa.js';
import { leerComunicacion, type ComunicacionBCRA, type TipoCom } from './fuentes/bcraComunicaciones.js';
import { leerEstado } from './estado.js';
import { fechaIso, guardarDia, Lote } from './procesar.js';
import { escribirSitio } from './sitio.js';

const fechas = process.argv.slice(2).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)).sort();
if (!fechas.length) {
  console.error('Uso: npm run historial -- AAAA-MM-DD [AAAA-MM-DD ...]');
  process.exit(2);
}
const desde = fechas[0];
const estado = await leerEstado();

// Las comunicaciones se numeran en orden: se lee hacia atrás desde la última
// conocida hasta pasar la primera fecha pedida. Algunas salen con unos días de
// diferencia entre número y fecha, por eso se corta recién tras varias más viejas.
const VIEJAS_PARA_CORTAR = 5;
const HUECOS_TOLERADOS = 5;
const porDia = new Map<string, ComunicacionBCRA[]>();
const erroresBcra: string[] = [];
const leidas: Record<string, number> = {};

for (const tipo of ['A', 'B', 'C'] as TipoCom[]) {
  const ultimo = estado.ultimaComunicacion[tipo];
  if (ultimo === undefined) {
    erroresBcra.push(`BCRA "${tipo}": no hay punto de partida en datos/estado.json; correr antes npm run revisar.`);
    continue;
  }
  try {
    let viejas = 0;
    let huecos = 0;
    leidas[tipo] = 0;
    for (let n = ultimo; viejas < VIEJAS_PARA_CORTAR && huecos < HUECOS_TOLERADOS && n > 0; n--) {
      const c = await leerComunicacion(tipo, n);
      if (!c) {
        huecos++;
        continue;
      }
      huecos = 0;
      leidas[tipo]++;
      const dia = c.fecha ? fechaIso(c.fecha) : '';
      if (dia && dia < desde) viejas++;
      else viejas = 0;
      if (fechas.includes(dia)) porDia.set(dia, [...(porDia.get(dia) ?? []), c]);
    }
    console.log(`BCRA "${tipo}": ${leidas[tipo]} comunicaciones leídas hacia atrás desde la ${tipo} ${ultimo}.`);
  } catch (e) {
    erroresBcra.push(`BCRA "${tipo}": ${(e as Error).message}`);
  }
}

// Prensa del BCRA: solo se ven las 10 más nuevas. Si no alcanzan para cubrir
// la primera fecha pedida, se avisa.
const noticiasPorDia = new Map<string, Omit<Noticia, 'texto'>[]>();
const erroresPrensa: string[] = [];
try {
  const lista = await listarNoticias();
  for (const n of lista) if (fechas.includes(n.fecha)) noticiasPorDia.set(n.fecha, [...(noticiasPorDia.get(n.fecha) ?? []), n]);
  if (lista.every((n) => n.fecha >= desde)) erroresPrensa.push('Prensa del BCRA: el listado no llega tan atrás; puede haber noticias de estos días sin revisar.');
} catch (e) {
  erroresPrensa.push(`Prensa del BCRA: ${(e as Error).message}`);
}

// Rentas Córdoba: el feed va de lo más nuevo a lo más viejo; se lee hasta
// pasar la primera fecha pedida.
const rentasPorDia = new Map<string, NormaRentas[]>();
try {
  for (let p = 1; p <= 10; p++) {
    const pagina = await listarRentas(p);
    for (const n of pagina) if (fechas.includes(n.fecha)) rentasPorDia.set(n.fecha, [...(rentasPorDia.get(n.fecha) ?? []), n]);
    if (pagina.some((n) => n.fecha && n.fecha < desde)) break;
  }
} catch (e) {
  erroresPrensa.push(`Rentas Córdoba: ${(e as Error).message}`);
}

for (const fecha of fechas) {
  const lote = new Lote();
  const revisado: string[] = [];
  const errores = [...erroresBcra, ...erroresPrensa];
  try {
    const avisos = await avisosDelDia(fecha.replaceAll('-', ''));
    lote.avisosBO(avisos, fecha);
    revisado.push(avisos.length ? `Boletín Oficial del ${fecha}: ${avisos.length} avisos de la primera sección.` : `Boletín Oficial del ${fecha}: no hubo edición.`);
  } catch (e) {
    errores.push(`Boletín Oficial del ${fecha}: ${(e as Error).message}`);
  }
  const deRentas = rentasPorDia.get(fecha) ?? [];
  for (const n of deRentas) lote.rentas(n);
  revisado.push(`Rentas Córdoba: ${deRentas.length} normas publicadas ese día.`);
  const noticias = noticiasPorDia.get(fecha) ?? [];
  for (const n of noticias) lote.noticia(await leerNoticia(n));
  revisado.push(`Prensa del BCRA: ${noticias.length} noticias de ese día.`);
  const comunicaciones = porDia.get(fecha) ?? [];
  for (const c of comunicaciones) lote.comunicacion(c);
  revisado.push(
    `BCRA: ${comunicaciones.length} comunicaciones con fecha de ese día${comunicaciones.length ? ` (${comunicaciones.map((c) => `${c.tipo} ${c.numero}`).join(', ')})` : ''}.`,
    'Textos ordenados del BCRA: se vigilan desde el 3/10/2026 en adelante (informe armado después).',
  );
  const { nuevos } = await guardarDia(fecha, lote, revisado, errores);
  console.log(`${fecha}: ${nuevos.length} normas.`);
}

const ahora = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
await escribirSitio(ahora.format(new Date()).replace(',', ' a las'));
console.log('Página del monitor: salida/index.html');
