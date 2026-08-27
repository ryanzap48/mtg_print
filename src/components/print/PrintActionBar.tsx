/** Sticky download bar for phones; the desktop button lives in DeckSummary. */
export function PrintActionBar({
  label,
  disabled,
  onDownload,
  onCancel,
  onShare,
}: {
  label: string
  disabled: boolean
  onDownload: () => void
  onCancel: () => void
  onShare: () => void
}) {
  return (
    <div
      className="safe-bottom fixed inset-x-0 bottom-0 z-10 px-4 pt-3 sm:hidden"
      style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
    >
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-primary flex-1"
          onClick={onDownload}
          disabled={disabled}
        >
          {label}
        </button>
        {disabled ? (
          <button type="button" className="btn btn-ghost px-4" onClick={onCancel}>
            Cancel
          </button>
        ) : (
          <button type="button" className="btn btn-ghost px-4" onClick={onShare}>
            Share
          </button>
        )}
      </div>
    </div>
  )
}
