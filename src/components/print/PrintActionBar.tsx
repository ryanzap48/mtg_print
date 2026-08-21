/** Sticky download bar for phones; the desktop button lives in DeckSummary. */
export function PrintActionBar({
  label,
  disabled,
  onDownload,
}: {
  label: string
  disabled: boolean
  onDownload: () => void
}) {
  return (
    <div
      className="safe-bottom fixed inset-x-0 bottom-0 z-10 px-4 pt-3 sm:hidden"
      style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
    >
      <button type="button" className="btn btn-primary w-full" onClick={onDownload} disabled={disabled}>
        {label}
      </button>
    </div>
  )
}
