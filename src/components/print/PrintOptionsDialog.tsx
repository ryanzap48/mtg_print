import { useEffect, useRef } from 'react'
import type { CutMarkStyle, PaperSize, PrintOptions, Quality } from '../../lib/print/types'
import { PAPER_PT, CARD_H_MM, CARD_W_MM, MM_TO_PT } from '../../lib/print/geometry'

interface Props {
  open: boolean
  options: PrintOptions
  onChange: (options: PrintOptions) => void
  onClose: () => void
  slotCount: number
  pages: number
}

export function PrintOptionsDialog({ open, options, onChange, onClose, slotCount, pages }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  const geo = PAPER_PT[options.paper]
  const marginX = (geo.w - 3 * CARD_W_MM * MM_TO_PT) / 2 / MM_TO_PT
  const marginY = (geo.h - 3 * CARD_H_MM * MM_TO_PT) / 2 / MM_TO_PT

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself, outside its content) closes.
        if (e.target === ref.current) onClose()
      }}
      className="m-0 w-full max-w-md rounded-t-2xl p-0 backdrop:bg-black/50 sm:m-auto sm:rounded-2xl"
      style={{
        background: 'var(--surface)',
        color: 'var(--text)',
        marginTop: 'auto',
        marginBottom: 0,
      }}
    >
      <div className="p-5 sm:p-6">
        <h2 className="text-lg font-bold">Print options</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          {slotCount} card{slotCount === 1 ? '' : 's'} · {pages} page{pages === 1 ? '' : 's'} · 9 per
          page at 63 × 88 mm
        </p>

        <div className="mt-5 space-y-5">
          <Field label="Paper size">
            <Segmented<PaperSize>
              value={options.paper}
              onChange={(paper) => onChange({ ...options, paper })}
              items={[
                { value: 'letter', label: 'US Letter' },
                { value: 'a4', label: 'A4' },
              ]}
            />
            <Hint>
              {geo.label} — margins {marginX.toFixed(1)} × {marginY.toFixed(1)} mm
            </Hint>
          </Field>

          <Field label="Cut guides">
            <Segmented<CutMarkStyle>
              value={options.cutMarks}
              onChange={(cutMarks) => onChange({ ...options, cutMarks })}
              items={[
                { value: 'marks', label: 'Crop marks' },
                { value: 'grid', label: 'Full grid' },
                { value: 'none', label: 'None' },
              ]}
            />
            <Hint>
              {options.cutMarks === 'marks'
                ? 'Short marks in the page margins — no ink lands on a card.'
                : options.cutMarks === 'grid'
                  ? 'Lines across the whole sheet, easiest to follow with a trimmer.'
                  : 'No guides printed.'}
            </Hint>
          </Field>

          <Field label="Image quality">
            <Segmented<Quality>
              value={options.quality}
              onChange={(quality) => onChange({ ...options, quality })}
              items={[
                { value: 'jpeg', label: 'Compact' },
                { value: 'png', label: 'Maximum' },
              ]}
            />
            <Hint>
              {options.quality === 'jpeg'
                ? 'Re-encodes at JPEG quality 92 — about a quarter the file size, with no difference you can see at 300 DPI.'
                : 'Embeds Scryfall’s original 300 DPI PNGs untouched. Roughly 4× the file size, and slower to build.'}
            </Hint>
          </Field>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={options.bleed}
              onChange={(e) => onChange({ ...options, bleed: e.target.checked })}
              className="mt-0.5 size-4 shrink-0 accent-neutral-900"
            />
            <span>
              <span className="text-sm font-semibold">Bleed edge</span>
              <Hint>
                Scales each card 2% so a slightly off-centre cut still leaves no white edge. Trims
                a sliver of the border.
              </Hint>
            </span>
          </label>
        </div>

        <div
          className="mt-6 rounded-lg p-3 text-xs/5"
          style={{ background: 'var(--surface-sunken)', color: 'var(--text-muted)' }}
        >
          <strong style={{ color: 'var(--text)' }}>When printing:</strong> set scale to “Actual
          size” or 100%, not “Fit to page”. Fitting silently shrinks the sheet and the cards will
          not fit sleeves.
        </div>

        <button type="button" className="btn btn-primary mt-5 w-full" onClick={onClose}>
          Done
        </button>
      </div>
    </dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{label}</p>
      {children}
    </div>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1.5 text-xs/5" style={{ color: 'var(--text-muted)' }}>
      {children}
    </p>
  )
}

function Segmented<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T
  onChange: (value: T) => void
  items: { value: T; label: string }[]
}) {
  return (
    <div
      className="grid gap-1 rounded-lg p-1"
      style={{
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        background: 'var(--surface-sunken)',
        border: '1px solid var(--border)',
      }}
    >
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            className="rounded-md px-2 py-1.5 text-xs font-semibold transition-colors"
            style={
              active
                ? { background: 'var(--text)', color: '#fff' }
                : { color: 'var(--text-muted)' }
            }
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
