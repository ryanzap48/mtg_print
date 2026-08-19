import { useCallback, useMemo, useRef, useState, useTransition } from 'react'
import { parseDeck, type DeckEntry } from './lib/parseDeck'
import { resolveDeck } from './lib/scryfall'
import { buildSlots, isDoubleFaced, pageCount, type SlotSource } from './lib/slots'
import { downloadBlob, generatePdf, progressLabel, type PdfProgress } from './lib/pdf'
import { DEFAULT_PRINT_OPTIONS, type PrintOptions, type ScryfallCard } from './lib/types'
import { DeckInput } from './components/DeckInput'
import { CardTile } from './components/CardTile'
import { PrintOptionsDialog } from './components/PrintOptionsDialog'
import { UnresolvedList } from './components/UnresolvedList'

const DECK_STORAGE_KEY = 'mtg-print:deck'
const OPTIONS_STORAGE_KEY = 'mtg-print:options'

/** One row of the review grid: the parsed line plus whichever printing is currently chosen. */
interface DeckItem {
  key: string
  entry: DeckEntry
  card: ScryfallCard
  qty: number
}

export default function App() {
  const [text, setText] = useState(() => localStorage.getItem(DECK_STORAGE_KEY) ?? '')
  const [items, setItems] = useState<DeckItem[] | null>(null)
  const [unresolved, setUnresolved] = useState<DeckEntry[]>([])
  const [invalidLines, setInvalidLines] = useState<string[]>([])
  const [error, setError] = useState<string>()
  const [resolving, setResolving] = useState(false)
  const [, startTransition] = useTransition()

  const [options, setOptions] = useState<PrintOptions>(() => {
    try {
      const saved = localStorage.getItem(OPTIONS_STORAGE_KEY)
      return saved ? { ...DEFAULT_PRINT_OPTIONS, ...JSON.parse(saved) } : DEFAULT_PRINT_OPTIONS
    } catch {
      return DEFAULT_PRINT_OPTIONS
    }
  })
  const [optionsOpen, setOptionsOpen] = useState(false)

  const [pdfProgress, setPdfProgress] = useState<PdfProgress | null>(null)
  const abortRef = useRef<AbortController>(null)

  const slots = useMemo(() => {
    if (!items) return []
    const sources: SlotSource[] = items.map((i) => ({
      entryKey: i.key,
      qty: i.qty,
      card: i.card,
    }))
    return buildSlots(sources)
  }, [items])

  const totalCopies = useMemo(() => items?.reduce((sum, i) => sum + i.qty, 0) ?? 0, [items])
  const pages = pageCount(slots.length)

  const updateOptions = useCallback((next: PrintOptions) => {
    setOptions(next)
    localStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(next))
  }, [])

  async function handleSubmit() {
    const { entries, invalid } = parseDeck(text)
    if (!entries.length) {
      setError('No cards found. Each line should look like “1 Sol Ring (MSC) 214”.')
      return
    }

    localStorage.setItem(DECK_STORAGE_KEY, text)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setError(undefined)
    setResolving(true)
    setInvalidLines(invalid)

    try {
      const { resolved, unresolved: missing } = await resolveDeck(entries, {
        signal: controller.signal,
      })
      const next = resolved.map(({ entry, card }) => ({
        key: entry.key,
        entry,
        card,
        qty: entry.qty,
      }))
      // View Transitions make the swap from the input screen to a full grid feel like one
      // continuous move instead of a hard cut. Guarded — Firefox has not shipped it.
      const commit = () => startTransition(() => {
        setItems(next)
        setUnresolved(missing)
      })
      if (document.startViewTransition) document.startViewTransition(commit)
      else commit()
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Something went wrong looking up your cards.')
    } finally {
      setResolving(false)
    }
  }

  async function handlePrint() {
    if (!slots.length || pdfProgress) return
    setError(undefined)
    // Border colour lets the worker flood JPEG's missing alpha channel with the right colour
    // where the source PNG has transparent rounded corners.
    const borderByEntry = new Map(items?.map((i) => [i.key, i.card.border_color]) ?? [])
    const workerSlots = slots.map((s) => ({
      imageUrl: s.imageUrl,
      borderColor: borderByEntry.get(s.entryKey),
    }))

    setPdfProgress({ phase: 'download', done: 0, total: workerSlots.length })
    try {
      const { promise } = generatePdf(workerSlots, options, setPdfProgress)
      const blob = await promise
      downloadBlob(blob, `mtg-print-${slots.length}-cards.pdf`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the PDF.')
    } finally {
      setPdfProgress(null)
    }
  }

  if (!items) {
    return (
      <main style={{ minHeight: '100dvh' }}>
        <DeckInput
          value={text}
          onChange={setText}
          onSubmit={handleSubmit}
          pending={resolving}
          error={error}
        />
      </main>
    )
  }

  const doubleFacedCount = items.filter((i) => isDoubleFaced(i.card)).length

  return (
    <main className="pb-28" style={{ minHeight: '100dvh' }}>
      <header
        className="sticky top-0 z-10 backdrop-blur"
        style={{
          background: 'color-mix(in oklab, var(--surface) 82%, transparent)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            className="btn btn-ghost px-3 py-1.5 text-xs"
            onClick={() => setItems(null)}
          >
            ← Edit list
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">
              {items.length} card{items.length === 1 ? '' : 's'}
              <span className="font-normal" style={{ color: 'var(--text-muted)' }}>
                {' '}
                · {totalCopies} cop{totalCopies === 1 ? 'y' : 'ies'} · {slots.length} to print ·{' '}
                {pages} page{pages === 1 ? '' : 's'}
              </span>
            </p>
            {doubleFacedCount > 0 && (
              <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {doubleFacedCount} double-faced card{doubleFacedCount === 1 ? '' : 's'} — both faces
                are printed
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-ghost px-3 py-1.5 text-xs"
            onClick={() => setOptionsOpen(true)}
          >
            Options
          </button>
          <button
            type="button"
            className="btn btn-primary hidden px-4 py-1.5 text-xs sm:inline-flex"
            onClick={handlePrint}
            disabled={!!pdfProgress || !slots.length}
          >
            {pdfProgress ? progressLabel(pdfProgress) : 'Download PDF'}
          </button>
        </div>
        {pdfProgress && (
          <div className="h-0.5 w-full" style={{ background: 'var(--surface-sunken)' }}>
            <div
              className="h-full transition-[width]"
              style={{
                width: `${Math.round((pdfProgress.done / Math.max(pdfProgress.total, 1)) * 100)}%`,
                background: 'var(--color-brand-500)',
              }}
            />
          </div>
        )}
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5">
        {error && (
          <p className="mb-4 text-sm font-medium text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <UnresolvedList
          entries={unresolved}
          invalidLines={invalidLines}
          onResolve={(entry, card) => {
            setItems((prev) => [...(prev ?? []), { key: entry.key, entry, card, qty: entry.qty }])
            setUnresolved((prev) => prev.filter((e) => e.key !== entry.key))
          }}
          onDismiss={(entry) => setUnresolved((prev) => prev.filter((e) => e.key !== entry.key))}
        />

        {/* Container queries size the grid from its own width, so the layout stays right
            regardless of what else is on the page. */}
        <div className="@container">
          <ul className="grid grid-cols-2 gap-x-3 gap-y-5 @sm:grid-cols-3 @2xl:grid-cols-4 @4xl:grid-cols-5 @6xl:grid-cols-6">
            {items.map((item) => (
              <CardTile
                key={item.key}
                card={item.card}
                qty={item.qty}
                onQtyChange={(qty) =>
                  setItems((prev) =>
                    prev!.map((i) => (i.key === item.key ? { ...i, qty: Math.max(1, qty) } : i)),
                  )
                }
                onVersionChange={(card) =>
                  setItems((prev) => prev!.map((i) => (i.key === item.key ? { ...i, card } : i)))
                }
                onRemove={() => setItems((prev) => prev!.filter((i) => i.key !== item.key))}
              />
            ))}
          </ul>
        </div>
      </div>

      {/* Mobile action bar — the header button is hidden below sm. */}
      <div
        className="safe-bottom fixed inset-x-0 bottom-0 z-10 px-4 pt-3 backdrop-blur sm:hidden"
        style={{
          background: 'color-mix(in oklab, var(--surface) 88%, transparent)',
          borderTop: '1px solid var(--border)',
        }}
      >
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={handlePrint}
          disabled={!!pdfProgress || !slots.length}
        >
          {pdfProgress
            ? progressLabel(pdfProgress)
            : `Download PDF · ${pages} page${pages === 1 ? '' : 's'}`}
        </button>
      </div>

      <PrintOptionsDialog
        open={optionsOpen}
        options={options}
        onChange={updateOptions}
        onClose={() => setOptionsOpen(false)}
        slotCount={slots.length}
        pages={pages}
      />
    </main>
  )
}
