import { useState } from 'react'
import type { ScryfallCard } from '../../lib/scryfall/types'
import { fetchPrintings } from '../../lib/scryfall/client'

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
      // non-English or digital card the user asked for explicitly by collector number).
      setPrintings(result.some((p) => p.id === card.id) ? result : [card, ...result])
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  const options = printings ?? [card]

  return (
    <>
      <select
        aria-label={`Printing of ${card.name}`}
        // `w-full` plus a `min-w-0` parent is what stops a long option label from setting the
        // select's intrinsic width and widening the whole grid track.
        className="field w-full max-w-full cursor-pointer truncate py-1 pr-6 text-[11px]"
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
      {failed && <p className="mt-1 text-[10px]" style={{ color: 'var(--danger)' }}>Couldn’t load printings.</p>}
    </>
  )
}
