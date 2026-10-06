// Corrida diaria: revisa todas las fuentes, guarda el informe del día en
// datos/informes/, rearma la página (salida/index.html) y actualiza
// datos/estado.json. Si ya corrió ese día, suma lo nuevo al mismo informe.
//
//   npm run revisar                         -> Boletín Oficial de hoy + novedades del BCRA y de Rentas Córdoba
//   npm run revisar -- --fecha 2026-10-02   -> Boletín Oficial de ese día
//   npm run revisar -- --bcra-desde A=8480  -> relee el BCRA desde ese número (para probar)
//
// Una fuente que falla no frena a las demás: queda anotada en el informe,
// porque un "hoy no hubo nada" falso es el peor error posible.

import { avisosDelDia, type AvisoBO } from './fuentes/boletinOficial.js';
import { listarRentas } from './fuentes/rentasCordoba.js';
import { leerNoticia, listarNoticias } from './fuentes/bcraPrensa.js';
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
// Si el monitor estuvo parado más que esto, se leen los últimos días y se avisa
// cuáles quedaron sin revisar: nunca se saltean en silencio.
const MAX_DIAS_ATRAS = 31;
const ayer = new Date(Date.parse(`${fecha}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

async function recorrerBoletin(nombre: string, clave: 'boletinHasta', leer: (dia: string) => Promise<AvisoBO[]>): Promise<boolean> {
  const hasta = estado[clave];
  // Se miran todos los días, fines de semana incluidos: el Boletín a veces
  // sale sábado o domingo (p. ej. 11/4/2020 y 26/4/2020).
  const pendientes = manual || !hasta ? [fecha] : diasEntre(hasta, fecha);
  const dias = pendientes.slice(-MAX_DIAS_ATRAS);
  if (dias.length < pendientes.length) {
    errores.push(`${nombre}: no se revisaron las ediciones del ${pendientes[0]} al ${pendientes[pendientes.length - dias.length - 1]} porque el monitor estuvo detenido más de ${MAX_DIAS_ATRAS} días. Se recomienda verificarlas manualmente.`);
  }
  // Hasta qué día quedó todo leído: avanza solo por días seguidos sin error, y
  // nunca incluye hoy, que se relee en cada corrida.
  let completoHasta = hasta ?? ayer;
  let seguidos = true;
  let edicionHoy = false;
  for (const dia of dias) {
    try {
      const avisos = await leer(dia);
      lote.avisosBO(avisos, dia);
      if (dia === fecha) {
        edicionHoy = avisos.length > 0;
        if (!manual) estado.boletinHoy = { fecha: dia, normas: avisos.length };
      }
      const cuando = dia === fecha ? '' : ' (día anterior, vuelto a mirar por si quedó algo)';
      revisado.push(avisos.length ? `${nombre} del ${dia}: ${avisos.length} normas${cuando}.` : `${nombre} del ${dia}: no hubo edición.`);
      if (dia < fecha && seguidos) completoHasta = dia;
    } catch (e) {
      seguidos = false;
      // Hoy se relee en cada corrida. Si una revisión anterior de hoy ya lo
      // leyó completo, la falla de la relectura no es un error: el día sigue
      // pendiente y la próxima corrida lo vuelve a leer (5/10/2026).
      const yaLeido = dia === fecha && estado.boletinHoy?.fecha === dia ? estado.boletinHoy.normas : undefined;
      if (yaLeido !== undefined) revisado.push(yaLeido ? `${nombre} del ${dia}: ${yaLeido} normas.` : `${nombre} del ${dia}: no hubo edición.`);
      else errores.push(`${nombre} del ${dia}: ${(e as Error).message}`);
    }
  }
  if (!manual) estado[clave] = completoHasta;
  return edicionHoy;
}

huboEdicion = await recorrerBoletin('Boletín Oficial', 'boletinHasta', (dia) => avisosDelDia(dia.replaceAll('-', '')));

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

// 4. Rentas Córdoba (Ingresos Brutos de la provincia donde SYS tiene su base):
// las normas que no se vieron todavía. Si toda la página es nueva, se miran
// las siguientes para no perder ninguna.
const MAX_PAGINAS_RENTAS = 5;
const VISTAS_GUARDADAS = 300;
try {
  const vistas = new Set(estado.rentasVistas ?? []);
  const primera = await listarRentas(1);
  if (!estado.rentasVistas) {
    // Primera corrida: se fija el punto de partida sin informar el histórico.
    estado.rentasVistas = primera.map((n) => n.id);
    revisado.push(`Rentas Córdoba: primera corrida, se arranca desde "${primera[0]?.titulo}".`);
  } else {
    const nuevas = primera.filter((n) => !vistas.has(n.id));
    let todasNuevas = nuevas.length === primera.length;
    for (let p = 2; p <= MAX_PAGINAS_RENTAS && todasNuevas; p++) {
      const pagina = await listarRentas(p);
      const mas = pagina.filter((n) => !vistas.has(n.id));
      nuevas.push(...mas);
      todasNuevas = mas.length === pagina.length;
    }
    if (todasNuevas) errores.push(`Rentas Córdoba: hay más de ${MAX_PAGINAS_RENTAS} páginas de normas nuevas; las más viejas pueden no haberse revisado.`);
    for (const n of nuevas) lote.rentas(n);
    estado.rentasVistas = [...nuevas.map((n) => n.id), ...estado.rentasVistas].slice(0, VISTAS_GUARDADAS);
    revisado.push(`Rentas Córdoba: ${nuevas.length} normas nuevas.`);
  }
} catch (e) {
  errores.push(`Rentas Córdoba: ${(e as Error).message}`);
}

// 5. Prensa del BCRA: las noticias que no se vieron todavía.
try {
  const vistas = new Set(estado.prensaVistas ?? []);
  const primera = await listarNoticias();
  if (!estado.prensaVistas) {
    // Primera corrida: se fija el punto de partida sin informar el histórico.
    estado.prensaVistas = primera.map((n) => n.id);
    revisado.push(`Prensa del BCRA: primera corrida, se arranca desde "${primera[0].titulo}".`);
  } else {
    const nuevas = primera.filter((n) => !vistas.has(n.id));
    for (const n of nuevas) lote.noticia(await leerNoticia(n));
    // Si todas las del listado son nuevas, puede haber más viejas sin ver.
    if (nuevas.length === primera.length) {
      errores.push(`Prensa del BCRA: las ${primera.length} noticias del listado son nuevas; puede haber otras anteriores sin revisar (mirar https://www.bcra.gob.ar/noticias/).`);
    }
    estado.prensaVistas = [...nuevas.map((n) => n.id), ...(estado.prensaVistas ?? [])].slice(0, VISTAS_GUARDADAS);
    revisado.push(`Prensa del BCRA: ${nuevas.length} noticias nuevas.`);
  }
} catch (e) {
  errores.push(`Prensa del BCRA: ${(e as Error).message}`);
}

// 6. Guardar, rearmar la página y dejar el aviso si hay algo nuevo.
// Las fallas le llegan a Guido por mail. El cliente no ve cortes pasajeros:
// en su página una fuente figura demorada solo si lleva más de 24 h fallando,
// y con un texto formal, nunca el error técnico.
const DEMORA_VISIBLE = 24 * 3_600_000;
const claveFalla = (e: string) => e.split(':')[0];
const ahora = new Date().toISOString();
const fallasDesde: Record<string, string> = {};
for (const e of errores) fallasDesde[claveFalla(e)] = estado.fallasDesde?.[claveFalla(e)] ?? ahora;
if (!manual) estado.fallasDesde = fallasDesde;
const demoras = [...new Set(errores.map(claveFalla))]
  .filter((k) => Date.parse(ahora) - Date.parse(fallasDesde[k]) >= DEMORA_VISIBLE)
  .map((k) => `${k}: la consulta se encuentra demorada; se completará automáticamente en la próxima actualización.`);
const { resumen, nuevos } = await guardarDia(fecha, lote, revisado, errores, { huboEdicion, demoras });
await escribirSitio(resumen.generado);

// Una fuente caída se avisa por mail cuando empieza a fallar, no en cada
// corrida (la página la sigue mostrando en rojo mientras dure).
const fuenteDe = (e: string) => e.split(':')[0].replace(/ del \d{4}-\d{2}-\d{2}$/, '');
const yaAvisadas = new Set(manual ? [] : (estado.fallasAvisadas ?? []));
const erroresNuevos = errores.filter((e) => !yaAvisadas.has(fuenteDe(e)));
if (!manual) estado.fallasAvisadas = [...new Set(errores.map(fuenteDe))];
await guardarEstado(estado);
await dejarAviso(fecha, nuevos, erroresNuevos);

console.log(armarMarkdown(resumen));
console.log(`\n${nuevos.length} normas nuevas en esta corrida. Página del monitor: salida/index.html`);
if (errores.length) process.exitCode = 1;
