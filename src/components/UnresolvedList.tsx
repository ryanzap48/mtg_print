import { useState } from 'react'
import type { DeckEntry } from '../lib/parseDeck'
import type { ScryfallCard } from '../lib/types'
import { searchByName } from '../lib/scryfall'
import { frontImage } from '../lib/slots'
import { versionLabel } from './VersionPicker'

interface Props {
  entries: DeckEntry[]
  invalidLines: string[]
  onResolve: (entry: DeckEntry, card: ScryfallCard) => void
  onDismiss: (entry: DeckEntry) => void
}

/**
 * Anything Scryfall could not match. Rather than silently dropping the line, offer a name
 * search so a typo'd set code or a collector number that moved can still be recovered.
 */
export function UnresolvedList({ entries, invalidLines, onResolve, onDismiss }: Props) {
  if (!entries.length && !invalidLines.length) return null

  return (
    <section
      className="mb-6 rounded-xl p-4"
      style={{
        background: 'color-mix(in oklab, oklch(0.7 0.18 40) 12%, var(--surface-raised))',
        border: '1px solid color-mix(in oklab, oklch(0.7 0.18 40) 35%, transparent)',
      }}
    >
      <h2 className="text-sm font-bold">
        {entries.length + invalidLines.length} line
        {entries.length + invalidLines.length === 1 ? '' : 's'} need attention
      </h2>

      {invalidLines.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            Could not be read as a card:
          </p>
          <ul className="mt-1 space-y-0.5">
            {invalidLines.map((line, i) => (
              <li key={i} className="font-mono text-xs">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="mt-3 space-y-3">
        {entries.map((entry) => (
          <UnresolvedRow
            key={entry.key}
            entry={entry}
            onResolve={(card) => onResolve(entry, card)}
            onDismiss={() => onDismiss(entry)}
          />
        ))}
      </ul>
    </section>
  )
}

function UnresolvedRow({
  entry,
  onResolve,
  onDismiss,
}: {
  entry: DeckEntry
  onResolve: (card: ScryfallCard) => void
  onDismiss: () => void
}) {
  const [results, setResults] = useState<ScryfallCard[] | null>(null)
  const [searching, setSearching] = useState(false)

  async function search() {
    setSearching(true)
    try {
      setResults(await searchByName(entry.name))
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  return (
    <li>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs">{entry.raw}</span>
        <button type="button" className="btn btn-ghost px-2 py-1 text-xs" onClick={search} disabled={searching}>
          {searching ? 'Searching…' : 'Find by name'}
        </button>
        <button type="button" className="btn btn-ghost px-2 py-1 text-xs" onClick={onDismiss}>
          Skip
        </button>
      </div>

      {results && results.length === 0 && (
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          No cards found for “{entry.name}”.
        </p>
      )}

      {results && results.length > 0 && (
        <ul className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {results.slice(0, 24).map((card) => {
            const src = frontImage(card)
            return (
              <li key={card.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onResolve(card)}
                  title={versionLabel(card)}
                  className="block w-20 overflow-hidden rounded-md ring-1 ring-black/10 hover:ring-2 hover:ring-[var(--color-brand-500)]"
                  style={{ aspectRatio: 'var(--aspect-card)' }}
                >
                  {src && <img src={src} alt={versionLabel(card)} loading="lazy" className="h-full w-full object-cover" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}
