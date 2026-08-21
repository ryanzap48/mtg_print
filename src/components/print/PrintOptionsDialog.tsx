import { useEffect, useRef } from 'react'
import type { CardGap, CutMarkStyle, PaperSize, PrintOptions, Quality } from '../../lib/print/types'
import { CARD_H_MM, CARD_W_MM, MM_TO_PT, PAPER_ORDER, PAPER_PT, pageGeometry } from '../../lib/print/geometry'
import { useScrollLock } from '../../hooks/useScrollLock'

interface Props {
  open: boolean
  options: PrintOptions
  onChange: (options: PrintOptions) => void
  onClose: () => void
  slotCount: number
  pages: number
  perSheet: number
  onCalibrate: () => void
  calibrating: boolean
}

export function PrintOptionsDialog({
  open,
  options,
  onChange,
  onClose,
  slotCount,
  pages,
  perSheet,
  onCalibrate,
  calibrating,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  // showModal() blocks interaction behind the dialog but does not stop the page scrolling,
  // so the list underneath still moves under a scroll or a trackpad swipe.
  useScrollLock(open)

  const geo = pageGeometry(options.paper, options.gapMm)
  const marginX = geo.marginX / MM_TO_PT
  const marginY = geo.marginY / MM_TO_PT
  const set = <K extends keyof PrintOptions>(key: K, value: PrintOptions[K]) =>
    onChange({ ...options, [key]: value })

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself, outside its content) closes.
        if (e.target === ref.current) onClose()
      }}
      className="mx-0 mt-auto mb-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-2xl p-0 backdrop:bg-black/50 sm:mx-auto sm:my-auto sm:max-h-[88dvh] sm:max-w-3xl sm:rounded-2xl"
      style={{ background: 'var(--surface)', color: 'var(--text)' }}
    >
      <div className="p-5 sm:p-7">
        <h2 className="text-lg font-bold">Print options</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          {slotCount} card{slotCount === 1 ? '' : 's'} | {pages} page{pages === 1 ? '' : 's'} |{' '}
          {perSheet} per page at {CARD_W_MM} × {CARD_H_MM} mm
        </p>

        {/* One column on phones; two on desktop, where a single 448px column left the modal
            a tall thin ribbon with most of the screen empty. */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2 sm:gap-x-8">
          <Field label="Paper size" className="sm:col-span-2">
            <Segmented<PaperSize>
              value={options.paper}
              onChange={(paper) => set('paper', paper)}
              columns={3}
              items={PAPER_ORDER.map((p) => ({
                value: p,
                label: PAPER_PT[p].label.split(',')[0],
              }))}
            />
            <Hint>
              {PAPER_PT[options.paper].label} | fits {geo.cols} × {geo.rows} = {geo.perSheet} cards
              | margins {marginX.toFixed(1)} × {marginY.toFixed(1)} mm
            </Hint>
          </Field>

          <Field label="Gap between cards">
            <Segmented<CardGap>
              value={options.gapMm}
              onChange={(gapMm) => set('gapMm', gapMm)}
              columns={4}
              items={[
                { value: 0, label: 'None' },
                { value: 0.2, label: '0.2 mm' },
                { value: 0.3, label: '0.3 mm' },
                { value: 1, label: '1 mm' },
              ]}
            />
            <Hint>
              {options.gapMm === 0
                ? 'Cards butt together, so one cut separates two cards. Fits the most per page.'
                : `A ${options.gapMm} mm channel between cards gives the blade somewhere to land, at the cost of a little space.`}
            </Hint>
          </Field>

          <Field label="Cut guides">
            <Segmented<CutMarkStyle>
              value={options.cutMarks}
              onChange={(cutMarks) => set('cutMarks', cutMarks)}
              columns={3}
              items={[
                { value: 'marks', label: 'Crop marks' },
                { value: 'grid', label: 'Full grid' },
                { value: 'none', label: 'None' },
              ]}
            />
            <Hint>
              {options.cutMarks === 'marks'
                ? 'Short marks in the page margins, so no ink lands on a card.'
                : options.cutMarks === 'grid'
                  ? 'Lines across the whole sheet, easiest to follow with a trimmer.'
                  : 'No guides printed.'}
            </Hint>
          </Field>

          <Field label="Image quality">
            <Segmented<Quality>
              value={options.quality}
              onChange={(quality) => set('quality', quality)}
              columns={2}
              items={[
                { value: 'jpeg', label: 'Compact' },
                { value: 'png', label: 'Maximum' },
              ]}
            />
            <Hint>
              {options.quality === 'jpeg'
                ? 'Re-encodes at JPEG quality 92, about a quarter the file size, with no difference you can see at 300 DPI.'
                : 'Embeds Scryfall’s original 300 DPI PNGs untouched. Roughly 4× the file size, and slower to build.'}
            </Hint>
          </Field>

          <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2 sm:gap-x-8">
            <Toggle
              checked={options.blackCorners}
              onChange={(v) => set('blackCorners', v)}
              label="Black corners"
              hint="Card art has transparent rounded corners. Filling them black makes a straight cut look like a black-bordered card instead of showing paper white."
            />
            <Toggle
              checked={options.bleed}
              onChange={(v) => set('bleed', v)}
              label="Bleed edge"
              hint="Scales each card 2% so a slightly off-centre cut still leaves no white edge. Trims a sliver of the border."
            />
            <Toggle
              checked={options.skipBasicLands}
              onChange={(v) => set('skipBasicLands', v)}
              label="Skip basic lands"
              hint="Leaves Plains, Island, Swamp, Mountain, Forest, Wastes and their snow variants out of the PDF. Most players already own plenty."
            />
            <Toggle
              checked={options.skipSideboard}
              onChange={(v) => set('skipSideboard', v)}
              label="Skip sideboard"
              hint="Leaves anything under a Sideboard or Maybeboard heading out of the PDF. Commander and companion entries still print."
            />
            <Toggle
              checked={options.printDecklist}
              onChange={(v) => set('printDecklist', v)}
              label="Print decklist"
              hint="Adds a text page at the end listing every card, quantity, set and collector number."
            />
          </div>
        </div>

        <div
          className="mt-6 rounded-lg p-3 text-xs/5"
          style={{ background: 'var(--surface-sunken)', color: 'var(--text-muted)' }}
        >
          <strong style={{ color: 'var(--text)' }}>When printing:</strong> set scale to “Actual
          size” or 100%, not “Fit to page”. Fitting silently shrinks the sheet and the cards will
          not fit sleeves.
          <button
            type="button"
            className="btn btn-ghost mt-3 w-full px-3 py-2 text-xs sm:w-auto"
            onClick={onCalibrate}
            disabled={calibrating}
          >
            {calibrating ? 'Building test page…' : 'Print a test page first'}
          </button>
          <span className="mt-2 block">
            One page with a 63 × 88 mm box and a ruler. Measure it before committing a whole deck
            to paper.
          </span>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            className="btn btn-primary w-full sm:w-auto sm:px-10"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </dialog>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
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

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-neutral-900"
      />
      <span>
        <span className="text-sm font-semibold">{label}</span>
        <Hint>{hint}</Hint>
      </span>
    </label>
  )
}

function Segmented<T extends string | number>({
  value,
  onChange,
  items,
  columns,
}: {
  value: T
  onChange: (value: T) => void
  items: { value: T; label: string }[]
  columns: number
}) {
  return (
    <div
      className="grid gap-1 rounded-lg p-1"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        background: 'var(--surface-sunken)',
        border: '1px solid var(--border)',
      }}
    >
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={String(item.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            className="rounded-md px-2 py-1.5 text-xs font-semibold transition-colors"
            style={active ? { background: 'var(--text)', color: '#fff' } : { color: 'var(--text-muted)' }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
