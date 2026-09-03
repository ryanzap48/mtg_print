/**
 * Scryfall documents 50-100ms between requests, but measured against the live API a sustained
 * 8 requests a second still earns a 429, and the penalty that follows is a flat minute-long
 * ban rather than a brief pause. 300ms held twenty-odd consecutive requests without one. Since
 * a search is only ever one or two requests, the extra spacing is invisible in normal use and
 * buys a wide margin against a failure that is expensive to recover from.
 */
const MIN_GAP_MS = 300

/**
 * How long a 429 is worth waiting out inline. Scryfall's penalty can be a minute, which is far
 * too long to hold a click; past this the caller is told rather than left hanging.
 */
const MAX_RETRY_WAIT_MS = 3000

/** The earliest moment the next request is allowed to start. */
let nextSlot = 0

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function gate<T>(run: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const start = Math.max(now, nextSlot)
  nextSlot = start + MIN_GAP_MS
  if (start > now) await sleep(start - now)
  return run()
}

/**
 * A Scryfall request, spaced against every other one and forgiving of a rate limit.
 *
 * Spacing has to be shared rather than per-caller: a search for cards and a search for tokens
 * run at the same time and know nothing about each other, so two individually polite chains
 * still interleave into an impolite burst. Only the *start* of each request is held back, so
 * calls still overlap in flight and running two searches together stays faster than running
 * them one after the other.
 *
 * A 429 is not just retried, it also pushes back every request still queued behind it, since
 * whatever is already in flight would otherwise walk straight into the same penalty.
 */
export async function pacedFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await gate(() => fetch(input, init))
  if (res.status !== 429) return res

  const wait = retryAfterMs(res)
  nextSlot = Math.max(nextSlot, Date.now() + wait)
  if (wait > MAX_RETRY_WAIT_MS) return res
  await sleep(wait)
  return gate(() => fetch(input, init))
}

function retryAfterMs(res: Response): number {
  const header = Number.parseFloat(res.headers.get('retry-after') ?? '')
  return Number.isFinite(header) && header > 0 ? header * 1000 : 1000
}
