import { useState } from 'react'
import type { ScryfallCard } from '../lib/types'
import { fetchPrintings } from '../lib/scryfall'

interface Props {
  card: ScryfallCard
  onSelect: (card: ScryfallCard) => void
}

export function versionLabel(card: ScryfallCard): string {
  const bits = [`${card.set_name} (${card.set.toUpperCase()}) #${card.collector_number}`]
  const effects = card.frame_effects?.filter((e) => e !== 'legendary') ?? []
  if (card.border_color === 'borderless') effects.push('borderless')
  if (effects.length) bits.push(`· ${effects.join(', ')}`)
  return bits.join(' ')
}

/**
 * A native <select> — on phones this becomes the platform's own picker, which handles a
 * 130-printing card far better than any custom popover, and it is keyboard accessible for
 * free. Printings are fetched on first interaction: eagerly loading them for every card in a
 * 100-card deck would mean ~100 extra requests for a control most cards never open.
 */
export function VersionPicker({ card, onSelect }: Props) {
  const [printings, setPrintings] = useState<ScryfallCard[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  async function load() {
    if (printings || loading) return
    setLoading(true)
    setFailed(false)
    try {
      const result = await fetchPrintings(card)
      // Guarantee the current printing is present even if it was filtered out (e.g. a
      // non-English or digital card the user explicitly asked for by collector number).
      setPrintings(result.some((p) => p.id === card.id) ? result : [card, ...result])
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  const options = printings ?? [card]

  return (
    <div className="relative">
      <select
        aria-label={`Printing of ${card.name}`}
        className="field cursor-pointer truncate py-1.5 pr-7 text-xs"
        value={card.id}
        disabled={loading}
        onFocus={load}
        onPointerDown={load}
        onChange={(e) => {
          const next = options.find((p) => p.id === e.target.value)
          if (next) onSelect(next)
        }}
      >
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {versionLabel(p)}
          </option>
        ))}
        {!printings && !loading && <option disabled>Loading other printings…</option>}
      </select>
      {loading && (
        <span
          className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px]"
          style={{ color: 'var(--text-muted)' }}
        >
          …
        </span>
      )}
      {failed && (
        <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">Could not load printings.</p>
      )}
      {printings && (
        <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {printings.length} printing{printings.length === 1 ? '' : 's'}
        </p>
      )}
    </div>
  )
}
