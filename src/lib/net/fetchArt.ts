/** Card art is immutable and served with a one-year max-age, so it is safe to keep. */
export const ART_CACHE = 'mtg-print-art-v1'

const MAX_ATTEMPTS = 3
const BASE_DELAY_MS = 300

export interface FetchArtDeps {
  fetch: typeof fetch
  caches?: CacheStorage
  sleep?: (ms: number) => Promise<void>
}

/**
 * Retries transient failures when downloading card art.
 *
 * An export pulls one request per distinct card, so without this a single blip discards the
 * whole job after tens of megabytes of work. A 404 or 403 is not retried: that image genuinely
 * is not there and asking again will not change it.
 */
export async function fetchWithRetry(url: string, deps: FetchArtDeps): Promise<Response> {
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await deps.fetch(url, { mode: 'cors' })
      if (res.ok) return res

      // Discard the failed body before retrying. An unread response body keeps holding a
      // connection from the browser's six-per-host pool, so leaking a few of them starves
      // every later fetch and the download stalls instead of recovering.
      // Bounded: a cancel() that neither resolves nor rejects would otherwise hang the whole
      // export with no error at all, which is the worst way for this to fail.
      await withTimeout(res.body?.cancel(), 2000, sleep)

      if (res.status === 404 || res.status === 403) {
        throw new UnavailableError(`Card art is unavailable (HTTP ${res.status}).`)
      }
      lastError = new Error(`Could not download card art (HTTP ${res.status}).`)
    } catch (err) {
      if (err instanceof UnavailableError) throw err
      lastError = err
    }
    if (attempt < MAX_ATTEMPTS) await sleep(BASE_DELAY_MS * 2 ** (attempt - 1))
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Could not download card art after several attempts.')
}

/** Awaits `work`, giving up after `ms`. Never rejects; the caller only cares that it ends. */
async function withTimeout(
  work: Promise<unknown> | undefined,
  ms: number,
  sleep: (ms: number) => Promise<void>,
): Promise<void> {
  if (!work) return
  try {
    await Promise.race([work, sleep(ms)])
  } catch {
    // Nothing here is worth failing a retry over.
  }
}

/** A permanent failure: retrying cannot help. */
export class UnavailableError extends Error {}

/**
 * Fetches card art, reusing a previously stored copy when there is one.
 *
 * A 100 card deck pulls close to 100 MB of PNGs, more than the browser's HTTP cache will hold,
 * so exports are stored explicitly in the Cache API and later exports of the same cards cost
 * nothing.
 */
export async function fetchArt(url: string, deps: FetchArtDeps): Promise<Blob> {
  let cache: Cache | undefined
  try {
    cache = await deps.caches?.open(ART_CACHE)
    const hit = await cache?.match(url)
    if (hit) return await hit.blob()
  } catch {
    // Cache API unavailable (private mode, older browser): fall through to the network.
  }

  const res = await fetchWithRetry(url, deps)

  // Read the body first, then store a fresh Response built from it.
  //
  // Do NOT `cache.put(url, res.clone())` and read `res.blob()` afterwards: clone() tees the
  // body, and awaiting the put backpressures that tee until the other branch is drained, which
  // cannot happen until the put returns.
  const blob = await res.blob()
  try {
    await cache?.put(url, new Response(blob, { headers: { 'Content-Type': blob.type } }))
  } catch {
    // Storage full or eviction refused; the blob we already have is still good.
  }
  return blob
}
