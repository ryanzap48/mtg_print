import type { SavedDeck } from '../../hooks/useDeckHistory'

interface Props {
  decks: SavedDeck[]
  onLoad: (deck: SavedDeck) => void
  onForget: (id: string) => void
}

/** One-click reload of a previously submitted decklist. */
export function SavedDecks({ decks, onLoad, onForget }: Props) {
  if (!decks.length) return null

  return (
    <section className="mt-4">
      <h2 className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
        Recent decks
      </h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {decks.map((deck) => (
          <li key={deck.id}>
            <span
              className="inline-flex items-center overflow-hidden rounded-md"
              style={{ border: '1px solid var(--border-strong)' }}
            >
              <button
                type="button"
                onClick={() => onLoad(deck)}
                title={`Load ${deck.label} (${deck.cardCount} cards), saved ${formatWhen(deck.savedAt)}`}
                className="max-w-[13rem] truncate px-2.5 py-1.5 text-xs hover:opacity-60"
              >
                <span className="font-medium">{deck.label}</span>
                <span style={{ color: 'var(--text-muted)' }}> {deck.cardCount} cards</span>
              </button>
              <button
                type="button"
                onClick={() => onForget(deck.id)}
                aria-label={`Forget ${deck.label}`}
                className="px-2 py-1.5 text-xs leading-none hover:opacity-60"
                style={{ borderLeft: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                ×
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function formatWhen(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  return new Date(ts).toLocaleDateString()
}
