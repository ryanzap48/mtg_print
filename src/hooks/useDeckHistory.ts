import { useCallback, useState } from 'react'
import { parseDeck } from '../lib/deck/parseDeck'

const HISTORY_KEY = 'mtg-print:history'
const MAX_ENTRIES = 8

export interface SavedDeck {
  id: string
  text: string
  /** First card in the list, used as a recognisable name for the entry. */
  label: string
  cardCount: number
  savedAt: number
}

function read(): SavedDeck[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const parsed = raw ? (JSON.parse(raw) as SavedDeck[]) : []
    return Array.isArray(parsed) ? parsed.filter((d) => d && typeof d.text === 'string') : []
  } catch {
    return []
  }
}

function write(decks: SavedDeck[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(decks))
  } catch {
    // Storage full or unavailable; history is a convenience, never a requirement.
  }
}

/**
 * Keeps the last few submitted decklists so they can be reloaded with one click.
 *
 * Only submitted lists are recorded, not every keystroke: a half-typed list is not something
 * anyone wants to come back to.
 */
export function useDeckHistory() {
  const [decks, setDecks] = useState<SavedDeck[]>(read)

  const remember = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const { entries } = parseDeck(trimmed)
    if (!entries.length) return

    setDecks((prev) => {
      // Re-submitting a list already in the history moves it to the front rather than
      // adding a duplicate.
      const withoutDuplicate = prev.filter((d) => d.text.trim() !== trimmed)
      const next: SavedDeck[] = [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text: trimmed,
          label: entries[0].name,
          cardCount: entries.reduce((sum, e) => sum + e.qty, 0),
          savedAt: Date.now(),
        },
        ...withoutDuplicate,
      ].slice(0, MAX_ENTRIES)
      write(next)
      return next
    })
  }, [])

  const forget = useCallback((id: string) => {
    setDecks((prev) => {
      const next = prev.filter((d) => d.id !== id)
      write(next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setDecks([])
    write([])
  }, [])

  return { decks, remember, forget, clear }
}
