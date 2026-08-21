import { useState } from 'react'
import type { ScryfallCard } from '../../lib/scryfall/types'
import { displayImage, isDoubleFaced } from '../../lib/deck/slots'
import { VersionPicker } from './VersionPicker'

interface Props {
  card: ScryfallCard
  qty: number
  onVersionChange: (card: ScryfallCard) => void
}

/**
 * Quantity is display-only. Changing counts or removing cards is done by editing the decklist
 * and resubmitting, which keeps the list the single source of truth and frees the width for
 * the card name and printing picker.
 */
export function CardTile({ card, qty, onVersionChange }: Props) {
  const [showBack, setShowBack] = useState(false)
  const twoFaced = isDoubleFaced(card)
  const src = displayImage(card, showBack ? 'back' : 'front') ?? displayImage(card)

  return (
    <li className="cv-auto flex min-w-0 flex-col gap-1.5">
      {/*
        Nothing is drawn on top of the artwork. Scryfall's image guidelines forbid covering the
        copyright or artist line, which runs along the bottom of every card, and forbid adding
        your own stamps or badges to card images, so every control lives outside the image.
      */}
      <div
        className="overflow-hidden rounded-[4.5%]"
        style={{ aspectRatio: 'var(--aspect-card)', background: 'var(--surface-sunken)' }}
      >
        {src && (
          <img
            // Keying on the URL restarts the load when the printing changes, so a swap reads as
            // a deliberate change rather than a flicker.
            key={src}
            src={src}
            alt={card.name}
            loading="lazy"
            decoding="async"
            crossOrigin="anonymous"
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="flex min-w-0 items-baseline gap-1.5">
        <span
          className="shrink-0 text-xs font-semibold tabular-nums md:text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          {qty}×
        </span>
        <p className="min-w-0 flex-1 truncate text-xs font-medium md:text-sm" title={card.name}>
          {card.name}
        </p>
        {twoFaced && (
          <button
            type="button"
            onClick={() => setShowBack((v) => !v)}
            title="Flip, both faces are printed"
            aria-label={`Show the ${showBack ? 'front' : 'back'} of ${card.name}. Both faces are printed.`}
            className="shrink-0 rounded px-1 text-[11px] leading-none hover:opacity-60"
            style={{ color: 'var(--text-muted)' }}
          >
            ⇋
          </button>
        )}
      </div>

      <VersionPicker card={card} onSelect={onVersionChange} />
    </li>
  )
}
