import { useId, useState } from 'react'
import type { DeckEntry } from '../../lib/deck/parseDeck'
import type { ScryfallCard } from '../../lib/scryfall/types'
import { RateLimitedError, searchNameAndTokens, type NameSearch } from '../../lib/scryfall/client'
import { pickerImage } from '../../lib/deck/slots'
import { versionLabel } from './VersionPicker'

interface Props {
  entries: DeckEntry[]
  invalidLines: string[]
  onResolve: (entry: DeckEntry, card: ScryfallCard) => void
  onDismiss: (entry: DeckEntry) => void
}

/**
 * Lines Scryfall could not match, plus lines that were not readable as cards at all. Rather
 * than silently dropping them, each offers a name search so a wrong set code or a collector
 * number that moved can still be recovered.
 */
export function UnresolvedCards({ entries, invalidLines, onResolve, onDismiss }: Props) {
  const total = entries.length + invalidLines.length
  if (!total) return null

  return (
    // No panel, no tint: the red text carries the message on its own.
    <section className="mt-5" style={{ color: 'var(--danger)' }}>
      <h2 className="text-sm font-semibold">
        Couldn’t find {total} card{total === 1 ? '' : 's'}
      </h2>

      <ul className="mt-2 space-y-2">
        {entries.map((entry) => (
          <UnresolvedRow
            key={entry.key}
            label={entry.raw}
            name={entry.name}
            onResolve={(card) => onResolve(entry, card)}
            onDismiss={() => onDismiss(entry)}
          />
        ))}
        {invalidLines.map((line, i) => (
          <li key={`invalid-${i}`} className="text-xs">
            <span className="font-mono break-all">{line}</span>
            <span className="opacity-70">, not a readable card line</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function UnresolvedRow({
  label,
  name,
  onResolve,
  onDismiss,
}: {
  label: string
  name: string
  onResolve: (card: ScryfallCard) => void
  onDismiss: () => void
}) {
  const [results, setResults] = useState<NameSearch | null>(null)
  const [tab, setTab] = useState<'cards' | 'tokens'>('cards')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string>()
  const [expanded, setExpanded] = useState(true)
  const listId = useId()

  async function search() {
    setSearching(true)
    setSearchError(undefined)
    try {
      const found = await searchNameAndTokens(name)
      setResults(found)
      // Land on whichever tab actually has something. A line reading "Treasure" has no card
      // matches at all, and opening on an empty tab reads as a failed search.
      setTab(found.cards.length ? 'cards' : 'tokens')
      setExpanded(true)
    } catch (err) {
      setResults({ cards: [], tokens: [] })
      setSearchError(
        err instanceof RateLimitedError
          ? err.message
          : 'Could not reach Scryfall. Check your connection and try again.',
      )
    } finally {
      setSearching(false)
    }
  }

  const shown = results ? (tab === 'cards' ? results.cards : results.tokens) : []
  const matches = shown.length
  const total = results ? results.cards.length + results.tokens.length : 0
  /**
   * Whichever sides found something. With both there is a choice to make, with one there is
   * only a label, but it is still worth showing: "Treasure" finds nothing but tokens, and
   * without the word nothing says why the results look like tokens.
   */
  const available = (['cards', 'tokens'] as const).filter((w) => results?.[w].length)

  return (
    <li>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-xs break-all">{label}</span>
        <button
          type="button"
          className="text-xs underline underline-offset-2 hover:opacity-60 disabled:opacity-40"
          onClick={search}
          disabled={searching}
        >
          {searching ? 'Searching…' : results ? 'Search again' : 'Find by name'}
        </button>

        {/* Results are large on purpose, so a row of them pushes the deck a long way down.
            Once they are on screen, offer a way to fold them back up. */}
        {matches > 0 && (
          <button
            type="button"
            className="text-xs underline underline-offset-2 hover:opacity-60"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={listId}
          >
            {expanded ? `Hide ${matches} match${matches === 1 ? '' : 'es'}` : `Show ${matches} match${matches === 1 ? '' : 'es'}`}
          </button>
        )}

        <button
          type="button"
          className="text-xs underline underline-offset-2 hover:opacity-60"
          onClick={onDismiss}
        >
          Skip
        </button>
      </div>

      {searchError && <p className="mt-1 text-xs opacity-80">{searchError}</p>}

      {!searchError && results && total === 0 && (
        <p className="mt-1 text-xs opacity-70">No cards or tokens found for “{name}”.</p>
      )}

      {available.length > 0 && expanded && (
        <div
          role={available.length > 1 ? 'tablist' : undefined}
          aria-label={available.length > 1 ? 'Result type' : undefined}
          className="mt-2 flex gap-4"
        >
          {available.map((which) =>
            available.length > 1 ? (
              <button
                key={which}
                type="button"
                role="tab"
                aria-selected={tab === which}
                aria-controls={listId}
                onClick={() => setTab(which)}
                className={`text-xs capitalize underline-offset-4 transition ${
                  tab === which ? 'font-semibold underline' : 'opacity-60 hover:opacity-100'
                }`}
              >
                {which} ({results?.[which].length})
              </button>
            ) : (
              <span key={which} className="text-xs font-semibold capitalize">
                {which} ({results?.[which].length})
              </span>
            ),
          )}
        </div>
      )}

      {matches > 0 && expanded && (
        <ul
          id={listId}
          role={available.length > 1 ? 'tabpanel' : undefined}
          className="mt-3 flex gap-3 overflow-x-auto pb-2"
        >
          {shown.slice(0, 24).map((card) => {
            const src = pickerImage(card)
            return (
              <li key={card.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onResolve(card)}
                  title={`${card.name} | ${versionLabel(card)}`}
                  className="block w-44 overflow-hidden rounded-lg ring-1 ring-black/10 transition hover:ring-2 hover:ring-current sm:w-64"
                  style={{ aspectRatio: 'var(--aspect-card)' }}
                >
                  {src && (
                    <img
                      src={src}
                      alt={`${card.name} | ${versionLabel(card)}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}
