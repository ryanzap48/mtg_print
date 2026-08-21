import { useMemo, useState } from 'react'
import { DeckInput } from '../components/deck/DeckInput'
import { DeckGrid } from '../components/deck/DeckGrid'
import { DeckSummary } from '../components/deck/DeckSummary'
import { UnresolvedCards } from '../components/deck/UnresolvedCards'
import { SavedDecks } from '../components/deck/SavedDecks'
import { PrintOptionsDialog } from '../components/print/PrintOptionsDialog'
import { PrintActionBar } from '../components/print/PrintActionBar'
import { usePdfExport } from '../hooks/usePdfExport'
import { usePersistentState } from '../hooks/usePersistentState'
import { buildSlots, isBasicLand, isDoubleFaced, pageCount } from '../lib/deck/slots'
import { pageGeometry } from '../lib/print/geometry'
import { progressLabel } from '../lib/print/exportPdf'
import { DEFAULT_PRINT_OPTIONS, type PrintOptions } from '../lib/print/types'
import { useDeckSession } from '../state/DeckSession'

const OPTIONS_STORAGE_KEY = 'mtg-print:options'

export function HomeRoute() {
  // Deck text, resolved cards and saved decks live above the routes, so they survive a trip
  // to About and back.
  const { text, setText, deck, history, submit } = useDeckSession()
  // Merge over the defaults so options saved before a new setting existed still work.
  const [options, setOptions] = usePersistentState<PrintOptions>(
    OPTIONS_STORAGE_KEY,
    DEFAULT_PRINT_OPTIONS,
    (stored) => ({ ...DEFAULT_PRINT_OPTIONS, ...(stored as Partial<PrintOptions>) }),
  )
  const [optionsOpen, setOptionsOpen] = useState(false)

  const { exportPdf, cancelExport, progress, error: exportError } = usePdfExport()

  // Skipping basics changes the sheet, so apply it here rather than inside the worker: the
  // counts on screen then match the PDF you actually get.
  const printedItems = useMemo(
    () => (deck.items ?? []).filter((i) => !(options.skipBasicLands && isBasicLand(i.card))),
    [deck.items, options.skipBasicLands],
  )
  const skippedBasics = (deck.items?.length ?? 0) - printedItems.length

  const slots = useMemo(
    () => buildSlots(printedItems.map((i) => ({ entryKey: i.key, qty: i.qty, card: i.card }))),
    [printedItems],
  )
  const totalCopies = useMemo(
    () => printedItems.reduce((sum, i) => sum + i.qty, 0),
    [printedItems],
  )
  const cardsByEntry = useMemo(
    () => new Map(printedItems.map((i) => [i.key, i.card])),
    [printedItems],
  )

  /** One line per card, in decklist order, for the optional printed listing. */
  const decklistLines = useMemo(
    () =>
      printedItems.map((i) => {
        const set = i.entry.set ? ` (${i.entry.set.toUpperCase()}) ${i.entry.collectorNumber}` : ''
        return `${i.qty}  ${i.card.name}${set}`
      }),
    [printedItems],
  )

  const geo = pageGeometry(options.paper, options.gapMm)
  const pages = pageCount(slots.length, geo.perSheet)
  const doubleFacedCount = printedItems.filter((i) => isDoubleFaced(i.card)).length
  const hasResults = Boolean(deck.items?.length)
  const error = deck.error ?? exportError

  const download = () => exportPdf(slots, cardsByEntry, options, decklistLines)

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <DeckInput
        value={text}
        onChange={setText}
        onSubmit={() => submit(text)}
        pending={deck.isResolving}
      />

      <SavedDecks
        decks={history.decks}
        onLoad={(saved) => setText(saved.text)}
        onForget={history.forget}
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
            cardCount={printedItems.length}
            skippedBasics={skippedBasics}
            perSheet={geo.perSheet}
            totalCopies={totalCopies}
            slotCount={slots.length}
            pages={pages}
            doubleFacedCount={doubleFacedCount}
            onOpenOptions={() => setOptionsOpen(true)}
            onDownload={download}
            onCancel={cancelExport}
            downloadLabel={progress ? progressLabel(progress) : 'Download PDF'}
            downloading={Boolean(progress)}
          />
          <DeckGrid items={printedItems} onVersionChange={deck.setCard} />
        </section>
      )}

      {hasResults && (
        <PrintActionBar
          label={
            progress
              ? progressLabel(progress)
              : `Download PDF | ${pages} page${pages === 1 ? '' : 's'}`
          }
          disabled={Boolean(progress)}
          onDownload={download}
          onCancel={cancelExport}
        />
      )}

      <PrintOptionsDialog
        open={optionsOpen}
        options={options}
        onChange={setOptions}
        onClose={() => setOptionsOpen(false)}
        slotCount={slots.length}
        pages={pages}
        perSheet={geo.perSheet}
      />
    </main>
  )
}
