import { useState } from 'react'
import type { ScryfallCard } from '../lib/types'
import { backImage, frontImage, isDoubleFaced } from '../lib/slots'
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
    <li className="cv-auto flex flex-col gap-2">
      <div className="group relative">
        <div
          className="overflow-hidden rounded-[4.5%] shadow-sm ring-1 ring-black/10"
          style={{ aspectRatio: 'var(--aspect-card)', background: 'var(--surface-sunken)' }}
        >
          {src && (
            <img
              // Keying on the URL restarts the fade when the printing changes, so a swap
              // reads as a deliberate change rather than a flicker.
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

        {qty > 1 && (
          <span className="absolute top-1.5 left-1.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-bold text-white tabular-nums">
            ×{qty}
          </span>
        )}

        {twoFaced && (
          <button
            type="button"
            onClick={() => setShowBack((v) => !v)}
            title="Flip — both faces are printed"
            aria-label={`Flip ${card.name}. Both faces will be printed.`}
            className="absolute right-1.5 bottom-1.5 rounded-md bg-black/75 px-2 py-1 text-[11px] font-semibold text-white hover:bg-black"
          >
            ⇋ {showBack ? 'Back' : 'Front'}
          </button>
        )}

        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${card.name}`}
          className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-md bg-black/70 text-sm leading-none text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          ×
        </button>
      </div>

      <p className="truncate text-xs font-semibold" title={card.name}>
        {card.name}
      </p>

      <div className="flex items-stretch gap-1.5">
        <div
          className="flex shrink-0 items-center rounded-lg"
          style={{ border: '1px solid var(--border)', background: 'var(--surface-raised)' }}
        >
          <button
            type="button"
            className="px-2 text-sm leading-none disabled:opacity-40"
            onClick={() => onQtyChange(qty - 1)}
            disabled={qty <= 1}
            aria-label={`Decrease quantity of ${card.name}`}
          >
            −
          </button>
          <span className="w-5 text-center text-xs font-semibold tabular-nums">{qty}</span>
          <button
            type="button"
            className="px-2 text-sm leading-none"
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
