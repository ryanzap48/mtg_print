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
  const front = displayImage(card, 'front')
  const back = twoFaced ? displayImage(card, 'back') : undefined
  const flip = () => setShowBack((v) => !v)

  return (
    <li className="cv-auto flex min-w-0 flex-col gap-1.5">
      {/*
        Nothing is drawn on top of the artwork. Scryfall's image guidelines forbid covering the
        copyright or artist line, which runs along the bottom of every card, and forbid adding
        your own stamps or badges to card images, so every control lives outside the image.
        For a double-faced card the artwork itself is the control.
      */}
      <CardFrame
        twoFaced={twoFaced}
        showBack={showBack}
        onFlip={flip}
        name={card.name}
        front={front}
        back={back}
      />

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
            onClick={flip}
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

/**
 * The card image. For a double-faced card both faces are rendered at once, back-to-back in 3D,
 * and flipping is a rotation rather than a swap.
 *
 * Rendering both up front is what makes the flip instant: the back is fetched with the tile,
 * so by the time anyone can click there is nothing left to load. Swapping the `src` instead
 * would show a blank card on the first flip of every card.
 */
function CardFrame({
  twoFaced,
  showBack,
  onFlip,
  name,
  front,
  back,
}: {
  twoFaced: boolean
  showBack: boolean
  onFlip: () => void
  name: string
  front?: string
  back?: string
}) {
  const face = (src: string | undefined, alt: string, isBack: boolean) =>
    src ? (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        crossOrigin="anonymous"
        className="absolute inset-0 h-full w-full rounded-[4.5%] object-cover"
        style={{
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: isBack ? 'rotateY(180deg)' : undefined,
        }}
      />
    ) : null

  const inner = (
    <div
      data-flipped={showBack ? 'true' : 'false'}
      className="relative h-full w-full transition-transform duration-500 ease-out"
      style={{
        transformStyle: 'preserve-3d',
        transform: showBack ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}
    >
      {face(front, name, false)}
      {face(back, `${name}, reverse face`, true)}
    </div>
  )

  const frame = { aspectRatio: 'var(--aspect-card)', background: 'var(--surface-sunken)' }

  if (!twoFaced) {
    return (
      <div className="relative rounded-[4.5%]" style={frame}>
        {inner}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onFlip}
      aria-pressed={showBack}
      aria-label={`${name}, double-faced. Show the ${showBack ? 'front' : 'back'}.`}
      // `perspective` has to sit on the parent of the rotating element for the turn to read as
      // depth rather than a flat squash.
      className="relative block w-full cursor-pointer rounded-[4.5%]"
      style={{ ...frame, perspective: '1200px' }}
    >
      {inner}
    </button>
  )
}
