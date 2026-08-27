interface Props {
  cardCount: number
  /** Cards left out by the skip options, whatever the reason. */
  skipped: number
  perSheet: number
  totalCopies: number
  slotCount: number
  pages: number
  doubleFacedCount: number
  onOpenOptions: () => void
  onDownload: () => void
  onShare: () => void
  onCancel: () => void
  downloadLabel: string
  downloading: boolean
}

/** Counts plus the desktop action buttons, above the card grid. */
export function DeckSummary({
  cardCount,
  skipped,
  perSheet,
  totalCopies,
  slotCount,
  pages,
  doubleFacedCount,
  onOpenOptions,
  onDownload,
  onShare,
  onCancel,
  downloadLabel,
  downloading,
}: Props) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-3"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-medium">
          {cardCount} card{cardCount === 1 ? '' : 's'}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          {' '}
          | {totalCopies} cop{totalCopies === 1 ? 'y' : 'ies'} | {slotCount} to print | {pages} page
          {pages === 1 ? '' : 's'} of {perSheet}
          {doubleFacedCount > 0 && ` | ${doubleFacedCount} double-faced`}
          {skipped > 0 && ` | ${skipped} skipped`}
        </span>
      </p>
      <button type="button" className="btn btn-ghost px-3 py-1.5 text-xs" onClick={onOpenOptions}>
        Options
      </button>
      <button
        type="button"
        className="btn btn-ghost px-3 py-1.5 text-xs"
        onClick={onShare}
        disabled={downloading}
      >
        Share
      </button>
      {downloading && (
        <button type="button" className="btn btn-ghost px-3 py-1.5 text-xs" onClick={onCancel}>
          Cancel
        </button>
      )}
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
