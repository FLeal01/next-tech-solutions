interface UfValor {
  valor: number;
  fecha: string;
}

const TTL_MS = 10 * 60 * 1000;
let cache: { data: UfValor; expira: number } | null = null;

/** Valor de la UF del día desde mindicador.cl, con caché de 10 minutos. */
export async function getUfDelDia(): Promise<UfValor | null> {
  if (cache && cache.expira > Date.now()) return cache.data;
  try {
    const resp = await fetch('https://mindicador.cl/api/uf', { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return cache?.data ?? null;
    const json = (await resp.json()) as { serie?: Array<{ valor: number; fecha: string }> };
    const ultimo = json.serie?.[0];
    if (!ultimo) return cache?.data ?? null;
    cache = { data: { valor: ultimo.valor, fecha: ultimo.fecha }, expira: Date.now() + TTL_MS };
    return cache.data;
  } catch {
    return cache?.data ?? null;
  }
}
