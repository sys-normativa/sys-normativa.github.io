// Pedidos HTTP con reintentos. Las fuentes son sitios públicos del Estado:
// se identifica el cliente y se espera entre reintentos para no castigarlos.

const UA = 'Mozilla/5.0 (compatible; SYS-Normativa/0.1)';

export async function pedir(url: string, intentos = 3): Promise<Response> {
  let ultimoError: unknown;
  for (let i = 0; i < intentos; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(30_000),
      });
      // 404 es una respuesta válida (p. ej. "esa comunicación todavía no existe").
      if (res.ok || res.status === 404) return res;
      ultimoError = new Error(`HTTP ${res.status} en ${url}`);
    } catch (e) {
      ultimoError = e;
    }
    await new Promise((r) => setTimeout(r, 2_000 * (i + 1)));
  }
  throw ultimoError;
}

export async function pedirTexto(url: string): Promise<string> {
  const res = await pedir(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  return res.text();
}

/** Corre `fn` sobre cada elemento con a lo sumo `limite` pedidos en paralelo. */
export async function enParalelo<T, R>(items: T[], limite: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const trabajador = async () => {
    while (i < items.length) {
      const k = i++;
      out[k] = await fn(items[k]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, items.length) }, trabajador));
  return out;
}
