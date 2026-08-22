import type { DeckEntry } from '../deck/parseDeck'
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
  { signal, onProgress }: { signal?: AbortSignal; onProgress?: (p: ResolveProgress) => void } = {}): Promise<ResolveResult> {
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
 * up front, prefetching would mean ~100 extra requests for a feature most cards never use.
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

function hasImage(card: ScryfallCard): boolean {
  return Boolean(card.image_uris?.png ?? card.card_faces?.[0]?.image_uris?.png)
}

/** Scryfall is asking us to slow down. Distinct from "that card does not exist". */
export class RateLimitedError extends Error {
  constructor() {
    super('Scryfall is rate limiting requests. Wait a moment and try again.')
  }
}

/** How many candidates the picker shows for a misspelling. */
const MAX_SUGGESTIONS = 24

/**
 * Finds the card someone meant when a decklist line will not resolve.
 *
 * Tries the cheapest, most certain lookups first and only works harder if they come up empty:
 *
 *  1. exact name, which covers a wrong set code or collector number on a correct name
 *  2. substring search, which covers a partial name
 *  3. a misspelling, where neither of the above matches anything
 *
 * For step 3 Scryfall's own fuzzy endpoint is consulted, but its answer is treated as one
 * candidate rather than as the answer: asked for "Sol Rng" it confidently returns "Oathsworn
 * Giant". Candidates are also gathered by searching the longest word, and the whole set is
 * ranked by how close each name is to what was typed, leaving the person to pick from pictures.
 */
export async function searchByName(name: string): Promise<ScryfallCard[]> {
  const typed = name.trim()
  if (!typed) return []

  const exact = await runSearch(`!"${typed.replace(/"/g, '')}"`)
  if (exact.length) return exact.slice(0, MAX_SUGGESTIONS)

  await sleep(REQUEST_DELAY_MS)
  const substring = await runSearch(typed)
  if (substring.length) return rankBySimilarity(substring, typed).slice(0, MAX_SUGGESTIONS)

  // A misspelling: gather anything plausible, then rank it.
  const candidates: ScryfallCard[] = []
  await sleep(REQUEST_DELAY_MS)
  const guess = await fuzzyNamed(typed)
  if (guess) candidates.push(guess)

  const longest = typed
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .sort((a, b) => b.length - a.length)[0]
  if (longest) {
    await sleep(REQUEST_DELAY_MS)
    candidates.push(...(await runSearch(longest)))
  }

  return rankBySimilarity(dedupeByName(candidates), typed).slice(0, MAX_SUGGESTIONS)
}

async function runSearch(query: string): Promise<ScryfallCard[]> {
  const res = await fetch(
    `${API}/cards/search?q=${encodeURIComponent(query)}&unique=cards&order=name`,
    { headers: JSON_HEADERS },
  )
  // A 404 genuinely means no such card; a 429 means we asked too fast. Reporting the second as
  // "no cards found" would send someone off to fix a decklist line that was never wrong.
  if (res.status === 429) throw new RateLimitedError()
  if (!res.ok) return []
  const payload = (await res.json()) as { data?: ScryfallCard[] }
  return dedupeByName((payload.data ?? []).filter((c) => !c.digital && hasImage(c)))
}

/** Scryfall's spelling-tolerant single-card lookup. Ambiguous or unknown names give nothing. */
async function fuzzyNamed(name: string): Promise<ScryfallCard | null> {
  const res = await fetch(`${API}/cards/named?fuzzy=${encodeURIComponent(name)}`, {
    headers: JSON_HEADERS,
  })
  if (res.status === 429) throw new RateLimitedError()
  if (!res.ok) return null
  const card = (await res.json()) as ScryfallCard
  return hasImage(card) ? card : null
}

/** Closest spelling first, so the intended card is not buried in a long alphabetical list. */
function rankBySimilarity(cards: ScryfallCard[], typed: string): ScryfallCard[] {
  const target = typed.toLowerCase()
  return [...cards].sort((a, b) => similarity(b.name, target) - similarity(a.name, target))
}

function similarity(candidate: string, target: string): number {
  const name = candidate.toLowerCase()
  // A name that simply contains what was typed beats what edit distance would suggest.
  if (name.startsWith(target)) return 1
  if (name.includes(target)) return 0.9
  const distance = editDistance(name.slice(0, 64), target.slice(0, 64))
  return 1 - distance / Math.max(name.length, target.length, 1)
}

/** Levenshtein distance, two rows rather than a full matrix. */
function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j]! + 1,
        row[j - 1]! + 1,
        prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    prev = row
  }
  return prev[b.length]!
}

/** Belt and braces: keep the first card for each distinct name whatever the API returns. */
function dedupeByName(cards: ScryfallCard[]): ScryfallCard[] {
  const seen = new Set<string>()
  return cards.filter((c) => {
    const key = c.name.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
