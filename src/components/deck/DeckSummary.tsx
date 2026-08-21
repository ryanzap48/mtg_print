interface Props {
  cardCount: number
  skippedBasics: number
  perSheet: number
  totalCopies: number
  slotCount: number
  pages: number
  doubleFacedCount: number
  onOpenOptions: () => void
  onDownload: () => void
  downloadLabel: string
  downloading: boolean
}

/** Counts plus the desktop action buttons, above the card grid. */
export function DeckSummary({
  cardCount,
  skippedBasics,
  perSheet,
  totalCopies,
  slotCount,
  pages,
  doubleFacedCount,
  onOpenOptions,
  onDownload,
  downloadLabel,
  downloading,
}: Props) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-3"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-medium">{cardCount} cards</span>
        <span style={{ color: 'var(--text-muted)' }}>
          {' '}
          | {totalCopies} cop{totalCopies === 1 ? 'y' : 'ies'} | {slotCount} to print | {pages} page
          {pages === 1 ? '' : 's'} of {perSheet}
          {doubleFacedCount > 0 && ` | ${doubleFacedCount} double-faced`}
          {skippedBasics > 0 && ` | ${skippedBasics} basic${skippedBasics === 1 ? '' : 's'} skipped`}
        </span>
      </p>
      <button type="button" className="btn btn-ghost px-3 py-1.5 text-xs" onClick={onOpenOptions}>
        Options
      </button>
      <button
        type="button"
        className="btn btn-primary hidden px-4 py-1.5 text-xs sm:inline-flex"
        onClick={onDownload}
        disabled={downloading}
      >
        {downloadLabel}
      </button>
    </div>
  )
}
