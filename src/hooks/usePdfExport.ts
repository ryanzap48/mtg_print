import { useCallback, useRef, useState } from 'react'
import {
  CANCELLED,
  generatePdf,
  openPdfTab,
  showPdf,
  updatePdfTab,
  type PdfProgress,
} from '../lib/print/exportPdf'
import type { PrintOptions } from '../lib/print/types'
import type { PrintSlot } from '../lib/deck/slots'
import type { ScryfallCard } from '../lib/scryfall/types'

/** Builds the PDF in a worker and hands the finished file to the browser. */
export function usePdfExport() {
  const [progress, setProgress] = useState<PdfProgress | null>(null)
  const [error, setError] = useState<string>()
  const jobRef = useRef<{ cancel: () => void; tab: Window | null } | null>(null)

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
        const onProgress = (p: PdfProgress) => {
          setProgress(p)
          updatePdfTab(tab, p)
        }
        const { promise, cancel } = generatePdf(workerSlots, options, decklist, onProgress)
        jobRef.current = { cancel, tab }
        showPdf(await promise, `mtg-print-${slots.length}-cards.pdf`, tab)
      } catch (err) {
        tab?.close()
        // A cancel terminates the worker, which surfaces here; that is not an error to report.
        if (!(err instanceof Error && err.message === CANCELLED)) {
          setError(err instanceof Error ? err.message : 'Could not build the PDF.')
        }
      } finally {
        jobRef.current = null
        setProgress(null)
      }
    },
    [progress])

  /** Aborts an in-flight build and closes the tab that was waiting for it. */
  const cancelExport = useCallback(() => {
    const job = jobRef.current
    if (!job) return
    job.cancel()
    job.tab?.close()
    jobRef.current = null
    setProgress(null)
  }, [])

  return { exportPdf, cancelExport, progress, error }
}
