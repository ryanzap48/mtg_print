import type { DeckEntry } from './parseDeck'
import type { CardIdentifier, ScryfallCard } from './types'
import { cardKey, getCachedCard, getCachedPrints, putCachedCard, putCachedPrints } from './cache'

const API = 'https://api.scryfall.com'
/** Scryfall's documented cap for POST /cards/collection. */
const MAX_IDENTIFIERS = 75
/** Scryfall asks for 50-100ms between requests; stay on the polite side of that. */
const REQUEST_DELAY_MS = 120

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * `User-Agent` is a forbidden header in browsers, so we cannot set it from fetch. Scryfall's
 * CORS policy is fully open (`access-control-allow-origin: *`) so this is not a problem.
 */
const JSON_HEADERS = { Accept: 'application/json' }

export interface ResolvedEntry {
  entry: DeckEntry
  card: ScryfallCard
}

export interface ResolveResult {
  resolved: ResolvedEntry[]
  /** Entries Scryfall could not match, in original order. */
  unresolved: DeckEntry[]
}

export interface ResolveProgress {
  done: number
  total: number
}

function identifierFor(entry: DeckEntry): CardIdentifier {
  if (entry.set && entry.collectorNumber) {
    return { set: entry.set, collector_number: entry.collectorNumber }
  }
  return { name: entry.name }
}

/**
 * Resolves every deck entry to a Scryfall card, hitting the cache first and batching the
 * remainder 75 at a time. A 97-card deck costs two network requests cold, and zero warm.
 */
export async function resolveDeck(
  entries: DeckEntry[],
  { signal, onProgress }: { signal?: AbortSignal; onProgress?: (p: ResolveProgress) => void } = {},
): Promise<ResolveResult> {
  const byKey = new Map<string, ScryfallCard>()
  const needed: DeckEntry[] = []

  // Pass 1: cache.
  for (const entry of entries) {
    if (!entry.set || !entry.collectorNumber) {
      needed.push(entry)
      continue
    }
    const cached = await getCachedCard(cardKey(entry.set, entry.collectorNumber))
    if (cached) byKey.set(entry.key, cached)
    else needed.push(entry)
  }

  let done = entries.length - needed.length
  onProgress?.({ done, total: entries.length })

  // Pass 2: batch the misses. Deduplicate identical identifiers so `4 Snow-Covered Plains
  // (MH1) 250` costs one slot in the batch rather than four.
  const unique = new Map<string, DeckEntry[]>()
  for (const entry of needed) {
    const id = identifierFor(entry)
    const k = id.name ? `name:${id.name.toLowerCase()}` : cardKey(id.set!, id.collector_number!)
    const list = unique.get(k)
    if (list) list.push(entry)
    else unique.set(k, [entry])
  }

  const groups = [...unique.values()]
  const unresolvedKeys = new Set<string>()

  for (let i = 0; i < groups.length; i += MAX_IDENTIFIERS) {
    signal?.throwIfAborted()
    const chunk = groups.slice(i, i + MAX_IDENTIFIERS)
    const identifiers = chunk.map((group) => identifierFor(group[0]))

    const res = await fetch(`${API}/cards/collection`, {
      method: 'POST',
      headers: { ...JSON_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers }),
      signal,
    })
    if (!res.ok) throw new Error(`Scryfall returned ${res.status} while looking up cards.`)
    const payload = (await res.json()) as { data: ScryfallCard[]; not_found?: CardIdentifier[] }

    // Match returned cards back to the identifier that asked for them. Scryfall preserves
    // neither order nor count, so key on set/collector number (or name for bare entries).
    const found = new Map<string, ScryfallCard>()
    for (const card of payload.data) {
      found.set(cardKey(card.set, card.collector_number), card)
      found.set(`name:${card.name.toLowerCase()}`, card)
      // Bare-name entries for a DFC ask for "Front", Scryfall answers "Front // Back".
      const frontFace = card.name.split(' // ')[0]
      if (frontFace) found.set(`name:${frontFace.toLowerCase()}`, card)
    }

    for (const group of chunk) {
      const id = identifierFor(group[0])
      const k = id.name ? `name:${id.name.toLowerCase()}` : cardKey(id.set!, id.collector_number!)
      const card = found.get(k)
      if (card) {
        await putCachedCard(cardKey(card.set, card.collector_number), card)
        for (const entry of group) byKey.set(entry.key, card)
      } else {
        for (const entry of group) unresolvedKeys.add(entry.key)
      }
      done += group.length
    }

    onProgress?.({ done, total: entries.length })
    if (i + MAX_IDENTIFIERS < groups.length) await sleep(REQUEST_DELAY_MS)
  }

  const resolved: ResolvedEntry[] = []
  const unresolved: DeckEntry[] = []
  for (const entry of entries) {
    const card = byKey.get(entry.key)
    if (card && !unresolvedKeys.has(entry.key)) resolved.push({ entry, card })
    else unresolved.push(entry)
  }
  return { resolved, unresolved }
}

/**
 * Every printing of a card, for the version dropdown. Fetched lazily on first open rather than
 * up front — prefetching would mean ~100 extra requests for a feature most cards never use.
 */
export async function fetchPrintings(card: ScryfallCard): Promise<ScryfallCard[]> {
  const cacheId = card.oracle_id ?? card.id
  const cached = await getCachedPrints(cacheId)
  if (cached) return cached

  const uri =
    card.prints_search_uri ??
    `${API}/cards/search?order=released&q=${encodeURIComponent(`oracleid:${card.oracle_id}`)}&unique=prints`

  const all: ScryfallCard[] = []
  let next: string | undefined = uri
  // Scryfall pages at 175 results; a handful of cards (Lightning Bolt, Sol Ring) exceed that.
  while (next && all.length < 700) {
    const res: Response = await fetch(next, { headers: JSON_HEADERS })
    if (!res.ok) {
      if (res.status === 404) break
      throw new Error(`Scryfall returned ${res.status} while listing printings.`)
    }
    const page = (await res.json()) as {
      data: ScryfallCard[]
      has_more?: boolean
      next_page?: string
    }
    all.push(...page.data)
    next = page.has_more ? page.next_page : undefined
    if (next) await sleep(REQUEST_DELAY_MS)
  }

  // Digital-only printings (Arena/MTGO) are not real cards and often have no print-quality
  // art, so they are poor candidates for a proxy sheet.
  const printable = all.filter((c) => !c.digital && c.lang === 'en' && hasImage(c))
  const result = printable.length ? printable : all.filter(hasImage)
  await putCachedPrints(cacheId, result)
  return result
}

export function hasImage(card: ScryfallCard): boolean {
  return Boolean(card.image_uris?.png ?? card.card_faces?.[0]?.image_uris?.png)
}

/** Free-text fallback used when a decklist line resolves to nothing. */
export async function searchByName(name: string): Promise<ScryfallCard[]> {
  const q = encodeURIComponent(`!"${name.replace(/"/g, '')}"`)
  const res = await fetch(`${API}/cards/search?q=${q}&unique=prints&order=released`, {
    headers: JSON_HEADERS,
  })
  if (!res.ok) {
    // Fall back to a fuzzy search when the exact-name search finds nothing.
    const fuzzy = await fetch(`${API}/cards/search?q=${encodeURIComponent(name)}&unique=prints`, {
      headers: JSON_HEADERS,
    })
    if (!fuzzy.ok) return []
    const payload = (await fuzzy.json()) as { data: ScryfallCard[] }
    return payload.data.filter(hasImage)
  }
  const payload = (await res.json()) as { data: ScryfallCard[] }
  return payload.data.filter((c) => !c.digital && hasImage(c))
}
