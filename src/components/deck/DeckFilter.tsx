interface Props {
  value: string
  onChange: (value: string) => void
  shown: number
  total: number
}

/**
 * Narrows which cards are displayed. A cube runs to hundreds of tiles, and finding the one
 * whose printing you want to change otherwise means scrolling for a long time.
 *
 * This is a view filter only: it never changes what ends up in the PDF, which the hint below
 * says out loud so nobody assumes filtering is a way to exclude cards.
 */
export function DeckFilter({ value, onChange, shown, total }: Props) {
  const filtering = value.trim().length > 0
  return (
    <div className="mt-4">
      <label className="block">
        <span className="sr-only">Filter cards by name</span>
        <input
          type="search"
          className="field max-w-sm"
          placeholder="Filter by card name"
          value={value}
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      {filtering && (
        <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          {shown === 0
            ? `No card matches “${value.trim()}”.`
            : `Showing ${shown} of ${total}. Filtering changes the view only, the PDF still has all ${total}.`}
        </p>
      )}
    </div>
  )
}
