import { useState } from 'react'
import type { ScryfallCard } from '../../lib/scryfall/types'
import { backImage, frontImage, isDoubleFaced } from '../../lib/deck/slots'
import { VersionPicker } from './VersionPicker'

interface Props {
  card: ScryfallCard
  qty: number
  onQtyChange: (qty: number) => void
  onVersionChange: (card: ScryfallCard) => void
  onRemove: () => void
}

export function CardTile({ card, qty, onQtyChange, onVersionChange, onRemove }: Props) {
  const [showBack, setShowBack] = useState(false)
  const twoFaced = isDoubleFaced(card)
  const src = (showBack ? backImage(card) : frontImage(card)) ?? frontImage(card)

  return (
    // `min-w-0` lets this grid item shrink below its content's intrinsic width; without it a
    // long <select> option can force the whole track wider than the viewport.
    <li className="cv-auto flex min-w-0 flex-col gap-1.5">
      {/*
        Nothing is drawn on top of the artwork. Scryfall's image guidelines forbid covering the
        copyright or artist line — which runs along the bottom of every card — and forbid adding
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

      <div className="flex min-w-0 items-center gap-1">
        <p className="min-w-0 flex-1 truncate text-xs font-medium" title={card.name}>
          {card.name}
        </p>
        {twoFaced && (
          <button
            type="button"
            onClick={() => setShowBack((v) => !v)}
            title="Flip — both faces are printed"
            aria-label={`Show the ${showBack ? 'front' : 'back'} of ${card.name}. Both faces are printed.`}
            className="shrink-0 rounded px-1 text-[11px] leading-none hover:opacity-60"
            style={{ color: 'var(--text-muted)' }}
          >
            ⇋
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${card.name}`}
          className="shrink-0 rounded px-1 text-sm leading-none hover:opacity-60"
          style={{ color: 'var(--text-muted)' }}
        >
          ×
        </button>
      </div>

      <div className="flex min-w-0 items-stretch gap-1.5">
        <div
          className="flex shrink-0 items-center rounded-md"
          style={{ border: '1px solid var(--border-strong)' }}
        >
          <button
            type="button"
            className="px-1.5 text-sm leading-none disabled:opacity-30"
            onClick={() => onQtyChange(qty - 1)}
            disabled={qty <= 1}
            aria-label={`Decrease quantity of ${card.name}`}
          >
            −
          </button>
          <span className="w-4 text-center text-xs tabular-nums">{qty}</span>
          <button
            type="button"
            className="px-1.5 text-sm leading-none"
            onClick={() => onQtyChange(qty + 1)}
            aria-label={`Increase quantity of ${card.name}`}
          >
            +
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <VersionPicker card={card} onSelect={onVersionChange} />
        </div>
      </div>
    </li>
  )
}
