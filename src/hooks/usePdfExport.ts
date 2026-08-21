import { useCallback, useState } from 'react'
import { generatePdf, openPdfTab, showPdf, type PdfProgress } from '../lib/print/exportPdf'
import type { PrintOptions } from '../lib/print/types'
import type { PrintSlot } from '../lib/deck/slots'
import type { ScryfallCard } from '../lib/scryfall/types'

/** Builds the PDF in a worker and hands the finished file to the browser. */
export function usePdfExport() {
  const [progress, setProgress] = useState<PdfProgress | null>(null)
  const [error, setError] = useState<string>()

  const exportPdf = useCallback(
    async (
      slots: PrintSlot[],
      cardsByEntry: Map<string, ScryfallCard>,
      options: PrintOptions,
      decklist: string[],
    ) => {
      if (!slots.length || progress) return
      // Claim the tab synchronously: everything below this point is past the user gesture.
      const tab = openPdfTab()
      setError(undefined)

      // Border colour lets the worker flood JPEG's missing alpha channel with the right colour
      // where the source PNG has transparent rounded corners.
      const workerSlots = slots.map((slot) => ({
        imageUrl: slot.imageUrl,
        borderColor: cardsByEntry.get(slot.entryKey)?.border_color,
      }))

      setProgress({ phase: 'download', done: 0, total: workerSlots.length })
      try {
        const { promise } = generatePdf(workerSlots, options, decklist, setProgress)
        showPdf(await promise, `mtg-print-${slots.length}-cards.pdf`, tab)
      } catch (err) {
        tab?.close()
        setError(err instanceof Error ? err.message : 'Could not build the PDF.')
      } finally {
        setProgress(null)
      }
    },
    [progress])

  return { exportPdf, progress, error }
}
