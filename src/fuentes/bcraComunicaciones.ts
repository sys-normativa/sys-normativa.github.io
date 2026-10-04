// Comunicaciones del BCRA ("A" normativas, "B" informativas, "C" correcciones).
// La mayoría NO sale en el Boletín Oficial: la fuente es el PDF en la web del
// BCRA, con dirección predecible por tipo y número correlativo:
// https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A8488.pdf
// Detectar las nuevas = preguntar por el número siguiente al último visto.

import { extractText, getDocumentProxy } from 'unpdf';
import { pedir } from '../http.js';

export type TipoCom = 'A' | 'B' | 'C';

export interface ComunicacionBCRA {
  tipo: TipoCom;
  numero: number;
  url: string;
  fecha: string;
  destinatarios: string;
  referencia: string;
  texto: string;
}

const urlDe = (tipo: TipoCom, n: number) => `https://www.bcra.gob.ar/archivos/Pdfs/comytexord/${tipo}${n}.pdf`;

// Números que pueden quedar sin publicar entre dos publicados. Pasados estos
// huecos seguidos se asume que se llegó al final.
const HUECOS_TOLERADOS = 5;

async function bajarPdf(tipo: TipoCom, n: number): Promise<Uint8Array | null> {
  const res = await pedir(urlDe(tipo, n));
  if (res.status === 404) return null;
  const buf = new Uint8Array(await res.arrayBuffer());
  // El sitio a veces responde 200 con una página HTML de error.
  const esPdf = buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;
  return esPdf ? buf : null;
}

export function parsearEncabezado(texto: string): Pick<ComunicacionBCRA, 'fecha' | 'destinatarios' | 'referencia'> {
  const plano = texto.replace(/\s+/g, ' ');
  const fecha = /COMUNICACI[OÓ]N\s*["“]?[ABC]["”]?\s*\d+\s*(\d{2}\/\d{2}\/\d{4})/i.exec(plano)?.[1] ?? '';
  // Entre la fecha y "Ref.:" van los destinatarios. Casi siempre empiezan con
  // "A LAS…/A LOS…", pero no siempre ("ADQUIRENTES DE PAGOS CON TARJETA:").
  const destinatarios = (/COMUNICACI[OÓ]N[\s\S]{0,40}?\d{2}\/\d{2}\/\d{4}\s*([\s\S]*?):?\s*Ref\.?:/i.exec(plano)?.[1] ?? '').trim();
  const referencia = (/Ref\.?:\s*([\s\S]*?)(_{3,}|Nos dirigimos|Les comunicamos)/i.exec(plano)?.[1] ?? '')
    // Palabras cortadas al final de renglón en el PDF: "Pa- go" -> "Pago".
    .replace(/(\p{Ll})- (\p{Ll})/gu, '$1$2')
    .trim();
  return { fecha, destinatarios, referencia };
}

export async function leerComunicacion(tipo: TipoCom, n: number): Promise<ComunicacionBCRA | null> {
  const pdf = await bajarPdf(tipo, n);
  if (!pdf) return null;
  const { text } = await extractText(await getDocumentProxy(pdf), { mergePages: true });
  return { tipo, numero: n, url: urlDe(tipo, n), texto: text, ...parsearEncabezado(text) };
}

export async function existe(tipo: TipoCom, n: number): Promise<boolean> {
  return (await bajarPdf(tipo, n)) !== null;
}

// El BCRA no conserva las comunicaciones más viejas en esta ruta: la búsqueda
// arranca de un número que se sabe publicado (verificado en octubre de 2026).
const PISO: Record<TipoCom, number> = { A: 8000, B: 13000, C: 90000 };

/**
 * Primera corrida: no hay "último visto". Se busca el último número publicado
 * con saltos cada vez más largos hasta pasarse y después por bisección. Un
 * hueco aislado puede dejarla unos números atrás; la búsqueda hacia adelante
 * lo compensa.
 */
export async function buscarUltimo(tipo: TipoCom): Promise<number> {
  let lo = PISO[tipo];
  if (!(await existe(tipo, lo))) throw new Error(`No se encontró la comunicación ${tipo}${lo}, revisar PISO`);
  let paso = 256;
  let hi = lo + paso;
  while (await existe(tipo, hi)) {
    lo = hi;
    paso *= 2;
    hi = lo + paso;
  }
  while (hi - lo > 1) {
    const m = Math.floor((lo + hi) / 2);
    if (await existe(tipo, m)) lo = m;
    else hi = m;
  }
  return lo;
}

/**
 * Comunicaciones publicadas después de `ultimoVisto`, en orden, y los números
 * salteados entre ellas (pueden publicarse más tarde: hay que volver a buscarlos).
 */
export async function nuevasDesde(tipo: TipoCom, ultimoVisto: number): Promise<{ nuevas: ComunicacionBCRA[]; salteados: number[] }> {
  const nuevas: ComunicacionBCRA[] = [];
  const salteados: number[] = [];
  let faltantes: number[] = [];
  for (let n = ultimoVisto + 1; faltantes.length < HUECOS_TOLERADOS; n++) {
    const c = await leerComunicacion(tipo, n);
    if (c) {
      nuevas.push(c);
      salteados.push(...faltantes);
      faltantes = [];
    } else {
      faltantes.push(n);
    }
  }
  return { nuevas, salteados };
}
