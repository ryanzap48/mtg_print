const KEY = 'mtg-print:feedback-sent'
/** Wait this long between messages. */
export const COOLDOWN_MS = 60_000
/** And no more than this many in a rolling window. */
export const MAX_PER_WINDOW = 3
export const WINDOW_MS = 60 * 60 * 1000

export interface RateVerdict {
  allowed: boolean
  /** Seconds until the next message is allowed, when blocked. */
  retryInSec: number
  reason?: 'cooldown' | 'hourly'
}

function read(): number[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : []
  } catch {
    return []
  }
}

/**
 * A courtesy limit, not a security control.
 *
 * This lives in localStorage and anyone who wants to bypass it can, in seconds. It exists to
 * stop double-clicks and accidental repeats. The real limits are the form provider's own
 * per-form quota and spam filtering, which cannot be reached from the browser.
 */
export function checkRate(now = Date.now()): RateVerdict {
  const recent = read().filter((t) => now - t < WINDOW_MS)

  const last = recent.at(-1)
  if (last !== undefined && now - last < COOLDOWN_MS) {
    return { allowed: false, retryInSec: Math.ceil((COOLDOWN_MS - (now - last)) / 1000), reason: 'cooldown' }
  }
  if (recent.length >= MAX_PER_WINDOW) {
    const oldest = recent[0]!
    return { allowed: false, retryInSec: Math.ceil((WINDOW_MS - (now - oldest)) / 1000), reason: 'hourly' }
  }
  return { allowed: true, retryInSec: 0 }
}

export function recordSend(now = Date.now()) {
  try {
    const recent = read().filter((t) => now - t < WINDOW_MS)
    localStorage.setItem(KEY, JSON.stringify([...recent, now]))
  } catch {
    // Without storage the limit simply does not apply; the provider still enforces its own.
  }
}
