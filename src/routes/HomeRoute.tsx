import { useMemo, useState } from 'react'
import { DeckInput } from '../components/deck/DeckInput'
import { DeckGrid } from '../components/deck/DeckGrid'
import { DeckSummary } from '../components/deck/DeckSummary'
import { UnresolvedCards } from '../components/deck/UnresolvedCards'
import { PrintOptionsDialog } from '../components/print/PrintOptionsDialog'
import { PrintActionBar } from '../components/print/PrintActionBar'
import { useDeckResolution } from '../hooks/useDeckResolution'
import { usePdfExport } from '../hooks/usePdfExport'
import { usePersistentState } from '../hooks/usePersistentState'
import { buildSlots, isDoubleFaced, pageCount } from '../lib/deck/slots'
import { progressLabel } from '../lib/print/exportPdf'
import { DEFAULT_PRINT_OPTIONS, type PrintOptions } from '../lib/print/types'

const DECK_STORAGE_KEY = 'mtg-print:deck'
const OPTIONS_STORAGE_KEY = 'mtg-print:options'

export function HomeRoute() {
  const [text, setText] = usePersistentState<string>(DECK_STORAGE_KEY, '')
  const [options, setOptions] = usePersistentState<PrintOptions>(
    OPTIONS_STORAGE_KEY,
    DEFAULT_PRINT_OPTIONS,
  )
  const [optionsOpen, setOptionsOpen] = useState(false)

  const deck = useDeckResolution()
  const { exportPdf, progress, error: exportError } = usePdfExport()

  const slots = useMemo(
    () =>
      deck.items
        ? buildSlots(deck.items.map((i) => ({ entryKey: i.key, qty: i.qty, card: i.card })))
        : [],
    [deck.items],
  )
  const totalCopies = useMemo(
    () => deck.items?.reduce((sum, i) => sum + i.qty, 0) ?? 0,
    [deck.items],
  )
  const cardsByEntry = useMemo(
    () => new Map((deck.items ?? []).map((i) => [i.key, i.card])),
    [deck.items],
  )

  const pages = pageCount(slots.length)
  const doubleFacedCount = deck.items?.filter((i) => isDoubleFaced(i.card)).length ?? 0
  const hasResults = Boolean(deck.items?.length)
  const error = deck.error ?? exportError

  const download = () => exportPdf(slots, cardsByEntry, options)
  const downloadLabel = progress ? progressLabel(progress) : 'Download PDF'

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <DeckInput
        value={text}
        onChange={setText}
        onSubmit={() => deck.resolve(text)}
        pending={deck.isResolving}
      />

      {error && (
        <p className="mt-3 text-sm" style={{ color: 'var(--danger)' }} role="alert">
          {error}
        </p>
      )}

      {/* Anything that could not be found, listed in red directly under the submit button. */}
      <UnresolvedCards
        entries={deck.unresolved}
        invalidLines={deck.invalidLines}
        onResolve={deck.addResolved}
        onDismiss={deck.dismissUnresolved}
      />

      {hasResults && (
        <section className="mt-6">
          <DeckSummary
            cardCount={deck.items!.length}
            totalCopies={totalCopies}
            slotCount={slots.length}
            pages={pages}
            doubleFacedCount={doubleFacedCount}
            onOpenOptions={() => setOptionsOpen(true)}
            onDownload={download}
            downloadLabel={downloadLabel}
            downloading={Boolean(progress)}
          />
          <DeckGrid
            items={deck.items!}
            onQtyChange={deck.setQty}
            onVersionChange={deck.setCard}
            onRemove={deck.remove}
          />
        </section>
      )}

      {hasResults && (
        <PrintActionBar
          label={progress ? progressLabel(progress) : `Download PDF · ${pages} page${pages === 1 ? '' : 's'}`}
          disabled={Boolean(progress)}
          onDownload={download}
        />
      )}

      <PrintOptionsDialog
        open={optionsOpen}
        options={options}
        onChange={setOptions}
        onClose={() => setOptionsOpen(false)}
        slotCount={slots.length}
        pages={pages}
      />
    </main>
  )
}
