// Textos ordenados del BCRA: la versión consolidada de cada tema normativo.
// La primera página dice "Última comunicación incorporada: "A" NNNN". Si ese
// número cambia, el tema cambió. Es la red de seguridad de la búsqueda por
// número: aunque una comunicación se escape, el texto ordenado la delata.

import { getDocumentProxy } from 'unpdf';
import { pedir } from '../http.js';
import type { Tema } from '../temas.js';

// Los temas que le aplican a un PSP que ofrece cuentas de pago.
// El porqué de cada uno está en docs/analisis-regulatorio.md.
export const TEXTOS_ORDENADOS: { archivo: string; temaSys: Tema; tema: string }[] = [
  { archivo: 't-snp-psp', temaSys: 'psp', tema: 'Proveedores de servicios de pago' },
  { archivo: 't-snp-tr', temaSys: 'pagos', tema: 'Sistema Nacional de Pagos – Transferencias' },
  { archivo: 't-snp-tr-nc', temaSys: 'pagos', tema: 'Sistema Nacional de Pagos – Transferencias – Normas complementarias' },
  { archivo: 't-snp-spd', temaSys: 'pagos', tema: 'Sistema Nacional de Pagos – Servicios de pago' },
  { archivo: 't-snp-dd', temaSys: 'pagos', tema: 'Sistema Nacional de Pagos – Débitos directos' },
  { archivo: 't-pusf', temaSys: 'usuarios', tema: 'Protección de los usuarios de servicios financieros' },
  { archivo: 't-rmrtsd', temaSys: 'tecnologia', tema: 'Riesgos de tecnología y seguridad de la información (servicios financieros digitales)' },
  { archivo: 't-rmgcti', temaSys: 'tecnologia', tema: 'Riesgos de tecnología y seguridad de la información' },
  { archivo: 't-excbio', temaSys: 'cambios', tema: 'Exterior y cambios' },
];

export interface EstadoTexto {
  archivo: string;
  tema: string;
  url: string;
  ultimaComunicacion: string;
  fechaTexto: string;
}

export async function leerEncabezado(archivo: string, tema: string): Promise<EstadoTexto | null> {
  const url = `https://www.bcra.gob.ar/archivos/Pdfs/Texord/${archivo}.pdf`;
  const res = await pedir(url);
  if (!res.ok) return null;
  const pdf = await getDocumentProxy(new Uint8Array(await res.arrayBuffer()));
  // Sólo hace falta la carátula, no el PDF entero (algunos tienen cientos de páginas).
  const pagina = await pdf.getPage(1);
  const contenido = await pagina.getTextContent();
  const texto = contenido.items.map((i) => ('str' in i ? i.str : '')).join(' ')
    .replace(/\s+/g, ' ')
    // Algunas carátulas parten los números: "8 433", "06 /0 5 /2 6".
    .replace(/(\d)\s+(?=\d)/g, '$1')
    .replace(/\s*\/\s*/g, '/');
  return {
    archivo,
    tema,
    url,
    ultimaComunicacion: /incorporada:\s*["“]?\s*([ABC])\s*["”]?\s*(\d+)/i.exec(texto)?.slice(1, 3).join(' ') ?? '',
    fechaTexto: /Texto ordenado al\s*(\d{2}\/\d{2}\/\d{2,4})/i.exec(texto)?.[1] ?? '',
  };
}

