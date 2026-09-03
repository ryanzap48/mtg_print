import type { ScryfallCard } from './types'
import { pacedFetch } from './pace'

const API = 'https://api.scryfall.com'
const JSON_HEADERS = { Accept: 'application/json' }
const MAX_SUGGESTIONS = 24

/**
 * Tokens are "extras" as far as Scryfall's search is concerned, and are left out of every
 * result unless asked for explicitly. That single flag is why searching "Treasure" finds
 * nothing at all by default.
 */
const TOKEN_QUERY = 'include_extras=true&unique=cards'

/**
 * Strips the word people naturally append.
 *
 * Nobody calls the card "Bird"; they call it a bird token. Scryfall names it "Bird", so
 * "bird token" has to lose its suffix before any lookup will match.
 */
export function normalizeTokenName(name: string): string {
  return name.trim().replace(/\s+tokens?$/i, '').trim()
}

export function isToken(card: ScryfallCard): boolean {
  return card.layout === 'token' || card.layout === 'double_faced_token'
}

/** A token whose whole name is the thing asked for, rather than one face of a two-sided token. */
function isStandalone(card: ScryfallCard, wanted: string): boolean {
  return card.layout === 'token' && card.name.toLowerCase() === wanted.toLowerCase()
}

async function search(query: string): Promise<ScryfallCard[]> {
  const res = await pacedFetch(`${API}/cards/search?${TOKEN_QUERY}&q=${encodeURIComponent(query)}`, {
    headers: JSON_HEADERS,
  })
  if (!res.ok) return []
  const payload = (await res.json()) as { data?: ScryfallCard[] }
  return (payload.data ?? []).filter((c) => isToken(c) && hasImage(c))
}

function hasImage(card: ScryfallCard): boolean {
  return Boolean(card.image_uris?.png ?? card.card_faces?.[0]?.image_uris?.png)
}

/**
 * The one token a decklist line means.
 *
 * Ranks a plain single-faced token above a two-sided one carrying the same name on its back:
 * asked for "Treasure", Scryfall's own name match happily returns "Dinosaur // Treasure",
 * which is not what anyone writing `1 Treasure` had in mind.
 */
export async function resolveToken(rawName: string): Promise<ScryfallCard | null> {
  const name = normalizeTokenName(rawName)
  if (!name) return null

  const memoKey = name.toLowerCase()
  const remembered = resolvedTokens.get(memoKey)
  if (remembered !== undefined) return remembered

  const matches = await search(`!"${name.replace(/"/g, '')}"`)
  const token = matches.find((c) => isStandalone(c, name)) ?? matches[0] ?? null
  // Misses are remembered too: a decklist full of ordinary misspellings would otherwise pay
  // for the same fruitless lookup on every resubmit.
  resolvedTokens.set(memoKey, token)
  return token
}

/** Name-only deck lines are never cache hits, so keep what each one resolved to for the session. */
const resolvedTokens = new Map<string, ScryfallCard | null>()

/**
 * Token suggestions for the picker, closest spelling first.
 *
 * Scryfall cannot help with a misspelled token: its fuzzy endpoint ignores extras entirely,
 * and substring search has nothing to match. So anything not spelled exactly right is matched
 * locally against the full list of token names, which costs one request rather than a series
 * of narrowing searches and is the only thing that recovers a transposition like "Brid",
 * sharing neither prefix nor substring with "Bird".
 */
export async function searchTokens(rawName: string): Promise<ScryfallCard[]> {
  const name = normalizeTokenName(rawName)
  if (!name) return []

  // Spelled correctly, which is the ordinary case, in one request.
  const exact = await search(`!"${name.replace(/"/g, '')}"`)
  if (exact.length) return order(exact, name).slice(0, MAX_SUGGESTIONS)

  const best = await bestNamesFromCatalogue(name)
  if (!best.length) return []
  const found = await search(best.map((n) => `!"${n.replace(/"/g, '')}"`).join(' or '))
  return order(found, name).slice(0, MAX_SUGGESTIONS)
}

function order(cards: ScryfallCard[], wanted: string): ScryfallCard[] {
  const target = wanted.toLowerCase()
  return [...cards].sort((a, b) => score(b, target) - score(a, target))
}

/** Plain tokens outrank two-sided ones, and closer spellings outrank distant ones. */
function score(card: ScryfallCard, target: string): number {
  const name = card.name.toLowerCase()
  const shape = card.layout === 'token' ? 0.15 : 0
  if (name === target) return 1 + shape
  if (name.startsWith(target)) return 0.8 + shape
  if (name.includes(target)) return 0.6 + shape
  return (1 - editDistance(name.slice(0, 40), target.slice(0, 40)) / Math.max(name.length, target.length, 1)) * 0.5 + shape
}

/**
 * Edit distance counting a swap of two neighbouring letters as one mistake rather than two.
 *
 * That single difference is what separates "Brid" from "Bird" by one edit instead of two, and
 * transposing letters is the typo people actually make when typing a name quickly.
 */
function editDistance(a: string, b: string): number {
  let twoBack: number[] = []
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let best = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, twoBack[j - 2]! + 1)
      }
      row[j] = best
    }
    twoBack = prev
    prev = row
  }
  return prev[b.length]!
}

/**
 * Every distinct token name, fetched once and kept.
 *
 * Around eight hundred names, small enough to hold and match against locally. Scryfall has no
 * catalog endpoint for these, `/catalog/card-names` covers real cards only, so the list has to
 * be paged out of search, which is why it is worth keeping between visits.
 */
const CATALOGUE_KEY = 'mtg-print:token-names'
/** New sets bring new tokens, so the stored copy goes stale eventually. */
const CATALOGUE_TTL_MS = 7 * 24 * 60 * 60 * 1000

interface StoredCatalogue {
  at: number
  names: string[]
}

let cataloguePromise: Promise<string[]> | null = null

async function tokenNameCatalogue(): Promise<string[]> {
  if (cataloguePromise) return cataloguePromise
  cataloguePromise = (async () => {
    const stored = readStoredCatalogue()
    if (stored) return stored

    const names = new Set<string>()
    let url: string | undefined = `${API}/cards/search?${TOKEN_QUERY}&q=${encodeURIComponent('t:token')}`
    // Five pages at the time of writing; the cap stops a runaway if that ever changes.
    for (let page = 0; url && page < 8; page++) {
      const at = url
      const res: Response = await pacedFetch(at, { headers: JSON_HEADERS })
      if (!res.ok) break
      const payload = (await res.json()) as {
        data?: ScryfallCard[]
        has_more?: boolean
        next_page?: string
      }
      for (const card of payload.data ?? []) names.add(card.name)
      url = payload.has_more ? payload.next_page : undefined
    }

    const list = [...names]
    // A partial list is not worth storing; better to page it again than to keep a copy that is
    // missing whatever the failed page held.
    if (list.length && !url) {
      try {
        localStorage.setItem(
          CATALOGUE_KEY,
          JSON.stringify({ at: Date.now(), names: list } satisfies StoredCatalogue),
        )
      } catch {
        // A full or unavailable localStorage just means paging it again next visit.
      }
    }
    return list
  })()
  return cataloguePromise
}

function readStoredCatalogue(): string[] | null {
  try {
    const raw = localStorage.getItem(CATALOGUE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredCatalogue
    if (!Array.isArray(parsed?.names) || !parsed.names.length) return null
    if (Date.now() - parsed.at > CATALOGUE_TTL_MS) return null
    return parsed.names
  } catch {
    return null
  }
}

/** How many names one follow-up request asks for. */
const CANDIDATES = 12
/** Below this length a substring match means nothing, nearly every token contains "at". */
const MIN_SUBSTRING = 3

/**
 * The names worth fetching for something that did not match exactly.
 *
 * Substring matches count as well as near spellings, so "Soldier" still surfaces "Cat Soldier"
 * and "Kor Soldier" the way a substring search used to, without the extra request.
 */
async function bestNamesFromCatalogue(typed: string): Promise<string[]> {
  const names = await tokenNameCatalogue()
  const target = typed.toLowerCase()
  return names
    .filter((name) => isPlausible(name.toLowerCase(), target))
    .map((name) => ({ name, s: nameScore(name.toLowerCase(), target) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, CANDIDATES)
    .map(({ name }) => name)
}

/**
 * Whether a token name could be what someone typed, as opposed to merely being the least
 * distant of eight hundred unrelated names.
 *
 * Without this, a misspelt *card* fills the tokens tab with junk: nothing in the catalogue is
 * anywhere near "Sol Rng", but something always ranks first.
 */
function isPlausible(name: string, target: string): boolean {
  if (target.length >= MIN_SUBSTRING && name.includes(target)) return true
  // A third of the typed length, so longer names tolerate more slips, with a floor of two so
  // short names are not held to an impossible standard.
  const limit = Math.max(2, Math.floor(target.length * 0.34))
  return editDistance(name.slice(0, 40), target.slice(0, 40)) <= limit
}

function nameScore(name: string, target: string): number {
  if (name === target) return 1
  if (name.startsWith(target)) return 0.9
  if (name.includes(target)) return 0.8
  const distance = editDistance(name.slice(0, 40), target.slice(0, 40))
  return Math.max(0, 1 - distance / Math.max(name.length, target.length, 1)) * 0.7
}
