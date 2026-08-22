import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useDeckResolution } from '../hooks/useDeckResolution'
import { useDeckHistory } from '../hooks/useDeckHistory'
import { usePersistentState } from '../hooks/usePersistentState'
import { formatDeckText } from '../lib/deck/formatDeck'

const DECK_STORAGE_KEY = 'mtg-print:deck'

/**
 * Holds everything about the deck currently on screen.
 *
 * This lives above the routes rather than inside the home page so that resolved cards survive
 * navigation: wandering off to About and back should return you to your cards, not to an empty
 * form. It is deliberately not persisted, so a refresh starts fresh.
 */
export type DeckSession = ReturnType<typeof useDeckSessionValue>

const Context = createContext<DeckSession | null>(null)

function useDeckSessionValue() {
  const [text, setText] = usePersistentState<string>(DECK_STORAGE_KEY, '')
  const deck = useDeckResolution()
  const history = useDeckHistory()
  /** The saved-deck entry that the cards on screen belong to. */
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null)

  const submit = (value: string) => {
    setActiveDeckId(history.remember(value))
    void deck.resolve(value)
  }

  /**
   * Restores a saved deck and resolves it straight away, so one click brings the cards back
   * rather than only refilling the box. Re-saving moves it to the front of the list, and the
   * new entry becomes the one that later printing swaps update.
   */
  const loadSaved = (savedText: string) => {
    setText(savedText)
    submit(savedText)
  }

  // Keep the saved copy in step while this deck is on screen: printing swaps and cards
  // recovered from a failed lookup both count. Until something is actually edited the text is
  // left exactly as it was typed, comments and section headers included.
  const { items, deckEdited } = deck
  const { update } = history
  useEffect(() => {
    if (!activeDeckId || !deckEdited || !items?.length) return
    update(activeDeckId, formatDeckText(items))
  }, [activeDeckId, deckEdited, items, update])

  return useMemo(
    () => ({ text, setText, deck, history, submit, loadSaved, activeDeckId }),
    // `submit` closes over the current values, so rebuild the object whenever they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, setText, deck, history, activeDeckId],
  )
}

export function DeckSessionProvider({ children }: { children: ReactNode }) {
  return <Context.Provider value={useDeckSessionValue()}>{children}</Context.Provider>
}

export function useDeckSession(): DeckSession {
  const value = useContext(Context)
  if (!value) throw new Error('useDeckSession must be used inside a DeckSessionProvider')
  return value
}
