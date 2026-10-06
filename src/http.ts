// Pedidos HTTP con reintentos. Las fuentes son sitios públicos del Estado:
// se identifica el cliente y se espera entre reintentos para no castigarlos.

const UA = 'Mozilla/5.0 (compatible; SYS-Normativa/0.1)';

// Esperas entre intentos: los cortes desde GitHub hacia los sitios del Estado
// suelen durar unos segundos o un par de minutos (p. ej. el Boletín Oficial,
// 5/10/2026 a la noche: "fetch failed" tres veces en 6 segundos).
const ESPERAS = [5_000, 20_000, 60_000];

export async function pedir(url: string, intentos = ESPERAS.length + 1, { seguirRedireccion = true } = {}): Promise<Response> {
  let ultimoError: unknown;
  for (let i = 0; i < intentos; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(30_000),
        redirect: seguirRedireccion ? 'follow' : 'manual',
      });
      // 404 es una respuesta válida (p. ej. "esa comunicación todavía no existe"),
      // y una redirección también cuando se pidió no seguirla.
      if (!seguirRedireccion && res.status >= 300 && res.status < 400) return res;
      // El cuerpo se descarga acá adentro, para que un corte a mitad de la
      // descarga también se reintente (Boletín Oficial desde GitHub, 5/10/2026
      // a la noche: "aborted due to timeout" y "terminated" leyendo el cuerpo).
      if (res.ok || res.status === 404) return await descargado(res);
      ultimoError = new Error(`HTTP ${res.status} en ${url}`);
    } catch (e) {
      ultimoError = e;
    }
    if (i < intentos - 1) await new Promise((r) => setTimeout(r, ESPERAS[Math.min(i, ESPERAS.length - 1)]));
  }
  throw explicarFalla(ultimoError, intentos);
}

/** Una copia de la respuesta con el cuerpo ya descargado (conserva la URL final). */
async function descargado(res: Response): Promise<Response> {
  const copia = new Response(await res.arrayBuffer(), { status: res.status, statusText: res.statusText, headers: res.headers });
  Object.defineProperty(copia, 'url', { value: res.url });
  return copia;
}

/** "fetch failed" no le dice nada al lector del informe: se traduce. */
function explicarFalla(e: unknown, intentos: number): Error {
  const err = e as Error & { cause?: { code?: string } };
  if (err?.name === 'TimeoutError' || /aborted due to timeout/.test(err?.message ?? '')) return new Error(`el sitio no respondió a tiempo (${intentos} intentos)`);
  if (err?.message === 'fetch failed') {
    const codigo = err.cause?.code ? `, ${err.cause.code}` : '';
    return new Error(`no se pudo conectar con el sitio (${intentos} intentos${codigo})`);
  }
  if (err?.message === 'terminated') return new Error(`el sitio cortó la conexión a mitad de la descarga (${intentos} intentos)`);
  return err instanceof Error ? err : new Error(String(e));
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
