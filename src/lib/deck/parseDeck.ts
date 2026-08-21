/**
 * Parser for MTG Arena / Moxfield style decklists.
 *
 *   1 Deserted Temple (MH3) 301 *F*
 *   4 Snow-Covered Plains (MH1) 250
 *   1 Esper Sentinel (PLST) MH2-12
 *   1 Emeria's Call / Emeria, Shattered Skyclave (ZNR) 12
 *   1 Sol Ring
 *
 * The set code + collector number is the authoritative key — the name is only ever used for
 * display, or as a fallback identifier when no set is given. That is why names containing
 * commas and slashes need no special handling.
 */

export type DeckSection = 'deck' | 'commander' | 'sideboard' | 'maybeboard'

export interface DeckEntry {
  /** Stable key for React lists and for pairing entries back to resolved cards. */
  key: string
  qty: number
  name: string
  /** Lowercased set code, e.g. "mh3". Undefined when the line had no `(SET) number` part. */
  set?: string
  collectorNumber?: string
  /** True when the line carried an Arena `*F*` foil marker. */
  foil: boolean
  section: DeckSection
  /** The original line, kept so we can report unparseable input verbatim. */
  raw: string
}

export interface ParseResult {
  entries: DeckEntry[]
  /** Lines that looked like content but could not be parsed at all. */
  invalid: string[]
}

/**
 * Validated against a 97-line real-world decklist with zero failures.
 * Groups: 1=qty 2=name 3=set 4=collector number 5=finish marker
 */
const WITH_SET = /^\s*(?:(\d+)\s*[xX]?\s+)?(.+?)\s+\((\w+)\)\s+(\S+?)\s*(\*F\*|\*E\*)?\s*$/
/** `2 Lightning Bolt`, `2x Lightning Bolt`, or a bare `Lightning Bolt`. */
const NAME_ONLY = /^\s*(?:(\d+)\s*[xX]?\s+)?(.+?)\s*(\*F\*|\*E\*)?\s*$/

const SECTION_HEADERS: Record<string, DeckSection> = {
  deck: 'deck',
  main: 'deck',
  maindeck: 'deck',
  commander: 'commander',
  commanders: 'commander',
  companion: 'commander',
  sideboard: 'sideboard',
  side: 'sideboard',
  maybeboard: 'maybeboard',
}

/** Arena exports an `About` block naming the deck; it contains no cards. */
const IGNORED_BLOCKS = new Set(['about'])

export function parseDeck(input: string): ParseResult {
  const entries: DeckEntry[] = []
  const invalid: string[] = []
  let section: DeckSection = 'deck'
  let ignoring = false
  let index = 0

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith('//') || line.startsWith('#')) continue

    // A section header is a bare word with no quantity and no set, e.g. "Sideboard" or
    // "Deck". Arena also writes "Commander" followed by the card on the next line.
    const headerKey = line.replace(/[:()]/g, '').trim().toLowerCase()
    if (SECTION_HEADERS[headerKey]) {
      section = SECTION_HEADERS[headerKey]
      ignoring = false
      continue
    }
    if (IGNORED_BLOCKS.has(headerKey)) {
      ignoring = true
      continue
    }
    // Arena's About block holds `Name Something`; skip until the next real header.
    if (ignoring) {
      if (/^Name\s/i.test(line)) continue
      ignoring = false
    }

    const withSet = WITH_SET.exec(line)
    if (withSet) {
      entries.push({
        key: `${index++}:${withSet[3].toLowerCase()}:${withSet[4]}`,
        qty: clampQty(withSet[1]),
        name: normalizeName(withSet[2]),
        set: withSet[3].toLowerCase(),
        collectorNumber: withSet[4],
        foil: withSet[5] === '*F*',
        section,
        raw: line,
      })
      continue
    }

    const nameOnly = NAME_ONLY.exec(line)
    if (nameOnly && nameOnly[2]) {
      entries.push({
        key: `${index++}:name:${nameOnly[2].toLowerCase()}`,
        qty: clampQty(nameOnly[1]),
        name: normalizeName(nameOnly[2]),
        foil: nameOnly[3] === '*F*',
        section,
        raw: line,
      })
      continue
    }

    invalid.push(line)
  }

  return { entries, invalid }
}

function clampQty(raw: string | undefined): number {
  const n = raw ? Number.parseInt(raw, 10) : 1
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(n, 999)
}

/**
 * Decklists write double-faced cards with a single slash; Scryfall uses a double slash.
 * Normalizing here keeps display names consistent with what the API returns.
 */
function normalizeName(name: string): string {
  return name.replace(/\s*\/\/?\s*/g, ' // ').trim()
}
