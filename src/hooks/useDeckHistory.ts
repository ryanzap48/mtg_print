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

  /** Returns the id of the saved entry, so later edits can be applied to that same one. */
  const remember = useCallback((text: string): string | null => {
    const trimmed = text.trim()
    if (!trimmed) return null
    const { entries } = parseDeck(trimmed)
    if (!entries.length) return null

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setDecks((prev) => {
      // Re-submitting a list already in the history moves it to the front rather than
      // adding a duplicate.
      const withoutDuplicate = prev.filter((d) => d.text.trim() !== trimmed)
      const next: SavedDeck[] = [
        {
          id,
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
    return id
  }, [])

  /**
   * Revises a saved deck in place, keeping its position in the list. Used while a deck is on
   * screen so that swapping a printing is reflected in what gets restored later.
   */
  const update = useCallback((id: string, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const { entries } = parseDeck(trimmed)
    if (!entries.length) return

    setDecks((prev) => {
      const at = prev.findIndex((d) => d.id === id)
      if (at === -1 || prev[at]!.text === trimmed) return prev
      const next = [...prev]
      next[at] = {
        ...prev[at]!,
        text: trimmed,
        label: entries[0].name,
        cardCount: entries.reduce((sum, e) => sum + e.qty, 0),
      }
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

  return { decks, remember, update, forget, clear }
}
