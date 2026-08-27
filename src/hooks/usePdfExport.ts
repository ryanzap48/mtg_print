import { useCallback, useRef, useState } from 'react'
import {
  CANCELLED,
  generatePdf,
  openPdfTab,
  showPdf,
  updatePdfTab,
  type PdfProgress,
} from '../lib/print/exportPdf'
import { toPdfFile } from '../lib/share/share'
import type { PrintOptions } from '../lib/print/types'
import type { PrintSlot } from '../lib/deck/slots'
import type { ScryfallCard } from '../lib/scryfall/types'

/** Builds the PDF in a worker and hands the finished file to the browser. */
export function usePdfExport() {
  const [progress, setProgress] = useState<PdfProgress | null>(null)
  const [error, setError] = useState<string>()
  /** The most recently built PDF, kept so sharing does not have to rebuild it. */
  const [builtFile, setBuiltFile] = useState<File | null>(null)
  const jobRef = useRef<{ cancel: () => void; tab: Window | null } | null>(null)

  /**
   * Builds the PDF and keeps it, without opening anything.
   *
   * Sharing needs the file in hand before the share sheet is opened: navigator.share requires
   * a user gesture, and awaiting a multi-second build consumes it. So the build happens first
   * and the sheet is opened by a second, fresh click.
   */
  const buildForShare = useCallback(
    async (
      slots: PrintSlot[],
      cardsByEntry: Map<string, ScryfallCard>,
      options: PrintOptions,
      decklist: string[],
    ) => {
      if (!slots.length || progress) return
      setError(undefined)
      setBuiltFile(null)
      const workerSlots = slots.map((slot) => ({
        imageUrl: slot.imageUrl,
        borderColor: cardsByEntry.get(slot.entryKey)?.border_color,
      }))
      setProgress({ phase: 'download', done: 0, total: workerSlots.length })
      try {
        const { promise } = generatePdf(workerSlots, options, decklist, setProgress)
        const blob = await promise
        setBuiltFile(toPdfFile(blob, `mtg-print-${slots.length}-cards.pdf`))
      } catch (err) {
        if (!(err instanceof Error && err.message === CANCELLED)) {
          setError(err instanceof Error ? err.message : 'Could not build the PDF.')
        }
      } finally {
        setProgress(null)
      }
    },
    [progress],
  )

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

  /** Hands the already-built file to the browser as a download. */
  const saveBuiltFile = useCallback(() => {
    if (builtFile) showPdf(builtFile, builtFile.name, null)
  }, [builtFile])

  return { exportPdf, buildForShare, builtFile, saveBuiltFile, cancelExport, progress, error }
}
