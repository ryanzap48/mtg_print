import type { DeckEntry } from './parseDeck'
import type { ScryfallCard } from '../scryfall/types'

export interface FormattableItem {
  entry: DeckEntry
  card: ScryfallCard
  qty: number
}

/**
 * Writes a decklist back out from the printings currently chosen.
 *
 * Used to keep a saved deck in step when someone swaps a printing after submitting: the saved
 * text has to name the printing they picked, not the one they originally typed. Set code and
 * collector number come from the chosen card, so re-submitting the result restores exactly
 * what is on screen.
 */
export function formatDeckText(items: FormattableItem[]): string {
  return items.map(formatDeckLine).join('\n')
}

export function formatDeckLine({ entry, card, qty }: FormattableItem): string {
  // Scryfall joins double-faced names with " // ", which the parser also accepts.
  const foil = entry.foil ? ' *F*' : ''
  return `${qty} ${card.name} (${card.set.toUpperCase()}) ${card.collector_number}${foil}`
}
