// Qué hace relevante a una norma para SYS: una billetera virtual para empresas
// registrada en el BCRA como proveedor de servicios de pago que ofrece cuentas
// de pago (PSPCP). El análisis que justifica cada regla está en
// docs/analisis-regulatorio.md; si se agrega una regla acá, se agrega allá.
//
// El filtro es deliberadamente generoso: perder una norma que afecta a SYS es
// mucho peor que mostrar una de más. Por eso hay dos niveles de salida.

import type { Tema } from './temas.js';
import { normalizar } from './texto.js';

export type Nivel = 'alta' | 'revisar' | 'descartada';

export interface Evaluacion {
  nivel: Nivel;
  puntaje: number;
  motivos: string[];
  /** Temas de SYS que toca, del que más pesa al que menos. */
  temas: Tema[];
}

interface Regla {
  /** Cómo se le explica al lector por qué apareció la norma. */
  motivo: string;
  tema: Tema;
  patron: RegExp;
  peso: number;
}

// Los patrones se aplican sobre texto normalizado (minúsculas, sin tildes).
const TERMINOS: Regla[] = [
  // Núcleo: nombran directamente la actividad de SYS.
  { motivo: 'proveedores de servicios de pago', tema: 'psp', patron: /proveedor(es)? de servicios de pago/, peso: 5 },
  { motivo: 'cuentas de pago', tema: 'psp', patron: /cuentas? de pago\b/, peso: 5 },
  { motivo: 'billeteras virtuales/digitales', tema: 'psp', patron: /billeteras? (virtual|digital|electronica)/, peso: 5 },
  { motivo: 'PSP/PSPCP', tema: 'psp', patron: /\bpspcp\b|\bpsp\b/, peso: 4 },
  { motivo: 'CVU', tema: 'psp', patron: /\bcvu\b|clave virtual uniforme/, peso: 4 },
  { motivo: 'SIRCUPA (IIBB sobre cuentas de pago)', tema: 'iibb', patron: /sircupa/, peso: 5 },
  { motivo: 'SIRTAC / regímenes de recaudación de IIBB', tema: 'iibb', patron: /sirtac|agentes? de recaudacion/, peso: 2 },

  // Medios de pago que SYS usa (QR, transferencias) y su infraestructura.
  // "QR" suelto no: aparece en cualquier norma que diga "se paga con VEP o QR".
  { motivo: 'pagos con transferencia / QR', tema: 'pagos', patron: /pagos? con transferencia|qr interoperable|pagos? (con|mediante) (codigo )?qr|aceptadores de pago/, peso: 3 },
  { motivo: 'transferencias inmediatas', tema: 'pagos', patron: /transferencias? (inmediata|electronica)s? de fondos/, peso: 3 },
  { motivo: 'sistema nacional de pagos', tema: 'pagos', patron: /sistema nacional de pagos/, peso: 3 },
  { motivo: 'DEBIN / débito inmediato', tema: 'pagos', patron: /\bdebin\b|debito inmediato/, peso: 3 },
  { motivo: 'agregadores / adquirentes', tema: 'pagos', patron: /agregador(es)? de (instrumentos de )?pago|adquirente/, peso: 2 },
  { motivo: 'tarjetas prepagas', tema: 'pagos', patron: /tarjetas? prepaga/, peso: 3 },
  { motivo: 'dinero electrónico', tema: 'psp', patron: /dinero electronico/, peso: 3 },
  // Un feriado bancario mueve acreditaciones y plazos, aunque no nombre a los PSP.
  // Peso débil a propósito: llega a "Para revisar", nunca a "Le afecta".
  { motivo: 'feriado bancario', tema: 'operativo', patron: /feriado bancario|asueto bancario/, peso: 2 },

  // Prevención de lavado: SYS es sujeto obligado ante la UIF desde la Ley 27.739.
  { motivo: 'Ley 27.739 (PSP sujetos obligados)', tema: 'lavado', patron: /27\.?739/, peso: 4 },
  { motivo: 'Ley 25.246 (lavado de activos)', tema: 'lavado', patron: /25\.?246/, peso: 2 },
  { motivo: 'sujetos obligados', tema: 'lavado', patron: /sujetos? obligados?/, peso: 1 },
  { motivo: 'emisores/operadores de pago (UIF)', tema: 'lavado', patron: /emisores,? operadores y proveedores de servicios de cobros? y\/?o pagos?|servicios de cobros? y\/?o pagos?/, peso: 5 },

  // Impuestos que pasan por la billetera.
  { motivo: 'impuesto a los débitos y créditos (Ley 25.413)', tema: 'cheque', patron: /25\.?413|creditos y debitos en cuentas/, peso: 3 },
  { motivo: 'régimen de información financiera', tema: 'impuestos', patron: /regimen de informacion/, peso: 1 },
  { motivo: 'Convenio Multilateral / IIBB', tema: 'iibb', patron: /convenio multilateral|ingresos brutos/, peso: 1 },
  { motivo: 'retenciones/percepciones', tema: 'impuestos', patron: /retencion(es)?|percepcion(es)?/, peso: 1 },

  // Otros frentes.
  { motivo: 'activos virtuales (PSAV)', tema: 'cnv', patron: /activos virtuales|\bpsav\b/, peso: 2 },
  { motivo: 'protección de usuarios de servicios financieros', tema: 'usuarios', patron: /proteccion de (los )?usuarios de servicios financieros/, peso: 3 },
  { motivo: 'fraude / seguridad en pagos', tema: 'tecnologia', patron: /prevencion del fraude|fraudes? (en|con) (pagos|transferencias|cuentas)/, peso: 2 },
  { motivo: 'riesgos de tecnología y seguridad de la información', tema: 'tecnologia', patron: /riesgos? de tecnologia y seguridad de la informacion/, peso: 2 },
  { motivo: 'Ley 25.326 (datos personales)', tema: 'datos', patron: /25\.?326/, peso: 1 },
  { motivo: 'entidades financieras', tema: 'general', patron: /entidades financieras/, peso: 1 },
];

// Organismos que regulan a SYS. Una norma suya necesita menos coincidencias
// para aparecer, pero el organismo solo nunca alcanza.
// `basta`: sus normas le importan a SYS aunque no la nombren (la UIF regula a
// todos los sujetos obligados a la vez).
const ORGANISMOS: { motivo: string; tema: Tema; patron: RegExp; basta?: boolean }[] = [
  { motivo: 'emitida por el BCRA', tema: 'general', patron: /banco central de la republica argentina/ },
  { motivo: 'emitida por la UIF', tema: 'lavado', patron: /unidad de informacion financiera/, basta: true },
  { motivo: 'emitida por la CNV', tema: 'cnv', patron: /comision nacional de valores/ },
  { motivo: 'emitida por ARCA', tema: 'impuestos', patron: /agencia de recaudacion y control aduanero$|agencia de recaudacion y control aduanero - (direccion general impositiva|subdireccion general de (fiscalizacion|recaudacion))/ },
  { motivo: 'emitida por la Comisión Arbitral', tema: 'iibb', patron: /comision arbitral/ },
  // Provincias (por ahora Córdoba): la autoridad de Ingresos Brutos.
  { motivo: 'emitida por Rentas (Ingresos Brutos provincial)', tema: 'iibb', patron: /direccion general de rentas|secretaria de ingresos publicos/ },
  { motivo: 'emitida por Economía', tema: 'general', patron: /^ministerio de economia/ },
  { motivo: 'emitida por Comercio/Defensa del Consumidor', tema: 'usuarios', patron: /comercio|defensa del consumidor/ },
  { motivo: 'emitida por la AAIP (datos personales)', tema: 'datos', patron: /acceso a la informacion publica/ },
  { motivo: 'decreto del Poder Ejecutivo', tema: 'general', patron: /^(poder ejecutivo|presidencia)/ },
];

// Avisos que mencionan términos del filtro pero nunca son normativa:
// citaciones y archivos de sumarios, edictos, licitaciones.
const RUIDO = /cita y emplaza|citase|notificase|emplazase|licitacion publica|sumario (en lo cambiario|cambiario|financiero)|dejar sin efecto la imputacion/;

// Lo que dispone la norma es nombrar, aceptar renuncias o mover personal.
const PERSONAL = /^\W*(articulo 1\W*\s*)?(designase|designanse|desígnase|dase por designad|prorrogase .{0,60}designacion|aceptase la renuncia|dase por concluid|asignase .{0,40}funciones)/;

const UMBRAL_ALTA = 5;
const UMBRAL_REVISAR = 3;
const PESO_ORGANISMO = 2;
const PESO_FUERTE = 3;
const PESO_MEDIO = 2;

export function evaluar(organismo: string, texto: string): Evaluacion {
  const org = normalizar(organismo.trim());
  const t = normalizar(texto);
  const motivos: string[] = [];
  let puntaje = 0;
  let hayTerminoFuerte = false;
  let hayTerminoMedio = false;
  const pesoPorTema = new Map<Tema, number>();
  const sumar = (tema: Tema, peso: number) => pesoPorTema.set(tema, (pesoPorTema.get(tema) ?? 0) + peso);

  for (const r of TERMINOS) {
    if (r.patron.test(t)) {
      puntaje += r.peso;
      motivos.push(r.motivo);
      sumar(r.tema, r.peso);
      if (r.peso >= PESO_FUERTE) hayTerminoFuerte = true;
      if (r.peso >= PESO_MEDIO) hayTerminoMedio = true;
    }
  }
  if (puntaje === 0) return { nivel: 'descartada', puntaje, motivos, temas: [] };

  const deOrganismo = ORGANISMOS.find((o) => o.patron.test(org));
  if (deOrganismo) {
    puntaje += PESO_ORGANISMO;
    motivos.push(deOrganismo.motivo);
    // Si el organismo tiene un tema propio, manda: una resolución de ARCA es,
    // ante todo, impositiva, aunque nombre a los PSP muchas veces.
    sumar(deOrganismo.tema, deOrganismo.tema === 'general' ? PESO_ORGANISMO : 100);
  }
  const temas = [...pesoPorTema].sort((a, b) => b[1] - a[1]).map(([tema]) => tema);

  if (RUIDO.test(t.slice(0, 1500))) return { nivel: 'descartada', puntaje, motivos: [...motivos, 'aviso de trámite (citación/edicto)'], temas };
  const dispone = /\b(resuelve|resuelven|decreta|dispone|disponen)\s*:/.exec(t);
  if (dispone && PERSONAL.test(t.slice(dispone.index + dispone[0].length, dispone.index + 400).trim())) {
    return { nivel: 'descartada', puntaje, motivos: [...motivos, 'designación o movimiento de personal'], temas };
  }

  // Sumar muchos términos débiles ("entidades financieras", "retenciones") no
  // alcanza: para "Le afecta" hace falta nombrar algo propio de SYS, y para
  // "Para revisar", al menos un tema de peso medio (o un organismo como la UIF).
  const nivel: Nivel =
    puntaje >= UMBRAL_ALTA && hayTerminoFuerte
      ? 'alta'
      : puntaje >= UMBRAL_REVISAR && (hayTerminoMedio || deOrganismo?.basta)
        ? 'revisar'
        : 'descartada';
  return { nivel, puntaje, motivos, temas };
}

/**
 * Las comunicaciones del BCRA dicen en el encabezado a quién van dirigidas.
 * Si nombran a los PSP, le aplican a SYS sin importar el tema.
 */
export function dirigidaAPsp(destinatarios: string): boolean {
  return /proveedores de servicios de pago/.test(normalizar(destinatarios));
}
