import { useCallback, useState } from 'react'
import { downloadBlob, generatePdf, type PdfProgress } from '../lib/print/exportPdf'
import type { PrintOptions } from '../lib/print/types'
import type { PrintSlot } from '../lib/deck/slots'
import type { ScryfallCard } from '../lib/scryfall/types'

/** Builds the PDF in a worker and hands the finished file to the browser. */
export function usePdfExport() {
  const [progress, setProgress] = useState<PdfProgress | null>(null)
  const [error, setError] = useState<string>()

  const exportPdf = useCallback(
    async (slots: PrintSlot[], cardsByEntry: Map<string, ScryfallCard>, options: PrintOptions) => {
      if (!slots.length || progress) return
      setError(undefined)

      // Border colour lets the worker flood JPEG's missing alpha channel with the right colour
      // where the source PNG has transparent rounded corners.
      const workerSlots = slots.map((slot) => ({
        imageUrl: slot.imageUrl,
        borderColor: cardsByEntry.get(slot.entryKey)?.border_color,
      }))

      setProgress({ phase: 'download', done: 0, total: workerSlots.length })
      try {
        const { promise } = generatePdf(workerSlots, options, setProgress)
        downloadBlob(await promise, `mtg-print-${slots.length}-cards.pdf`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not build the PDF.')
      } finally {
        setProgress(null)
      }
    },
    [progress],
  )

  return { exportPdf, progress, error }
}
