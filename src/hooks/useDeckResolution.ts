import { useCallback, useRef, useState } from 'react'
import { parseDeck, type DeckEntry } from '../lib/deck/parseDeck'
import { resolveDeck } from '../lib/scryfall/client'
import type { ScryfallCard } from '../lib/scryfall/types'

/** A parsed decklist line paired with the printing currently chosen for it. */
export interface DeckItem {
  key: string
  entry: DeckEntry
  card: ScryfallCard
  qty: number
}

/**
 * Owns everything about turning decklist text into resolved cards: parsing, the Scryfall
 * lookup, and the per-card edits (quantity, printing, removal) the user makes afterwards.
 */
export function useDeckResolution() {
  const [items, setItems] = useState<DeckItem[] | null>(null)
  const [unresolved, setUnresolved] = useState<DeckEntry[]>([])
  const [invalidLines, setInvalidLines] = useState<string[]>([])
  const [error, setError] = useState<string>()
  const [isResolving, setIsResolving] = useState(false)
  /** True once a printing has been swapped since this deck was resolved. */
  const [printingsChanged, setPrintingsChanged] = useState(false)
  const abortRef = useRef<AbortController>(null)

  const resolve = useCallback(async (text: string) => {
    const { entries, invalid } = parseDeck(text)
    setInvalidLines(invalid)

    if (!entries.length) {
      setError('No cards found. Each line should look like “1 Sol Ring (MSC) 214”.')
      setItems(null)
      return
    }

    // A resubmit while a lookup is in flight cancels the previous one.
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setError(undefined)
    setIsResolving(true)
    setPrintingsChanged(false)
    try {
      const { resolved, unresolved: missing } = await resolveDeck(entries, {
        signal: controller.signal,
      })
      setItems(resolved.map(({ entry, card }) => ({ key: entry.key, entry, card, qty: entry.qty })))
      setUnresolved(missing)
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Something went wrong looking up your cards.')
    } finally {
      setIsResolving(false)
    }
  }, [])

  const setCard = useCallback((key: string, card: ScryfallCard) => {
    setItems((prev) => prev?.map((i) => (i.key === key ? { ...i, card } : i)) ?? null)
    setPrintingsChanged(true)
  }, [])

  const addResolved = useCallback((entry: DeckEntry, card: ScryfallCard) => {
    setItems((prev) => [...(prev ?? []), { key: entry.key, entry, card, qty: entry.qty }])
    setUnresolved((prev) => prev.filter((e) => e.key !== entry.key))
  }, [])

  const dismissUnresolved = useCallback((entry: DeckEntry) => {
    setUnresolved((prev) => prev.filter((e) => e.key !== entry.key))
  }, [])

  return {
    items,
    unresolved,
    invalidLines,
    error,
    isResolving,
    printingsChanged,
    resolve,
    setCard,
    addResolved,
    dismissUnresolved,
    setError,
  }
}
