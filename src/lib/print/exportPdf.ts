import type { PrintOptions } from './types'
import type { GenerateRequest, WorkerMessage, WorkerSlot } from '../../workers/pdf.worker'

export interface PdfProgress {
  phase: 'download' | 'embed' | 'draw'
  done: number
  total: number
}

const PHASE_LABEL: Record<PdfProgress['phase'], string> = {
  download: 'Downloading card art',
  embed: 'Embedding images',
  draw: 'Laying out pages',
}

export function progressLabel(p: PdfProgress): string {
  return `${PHASE_LABEL[p.phase]} ${p.done}/${p.total}`
}

/**
 * Runs the whole build in a worker so a 100-card deck (~95 MB of art to fetch, decode and
 * re-encode) never blocks the main thread.
 */
export function generatePdf(
  slots: WorkerSlot[],
  options: PrintOptions,
  decklist: string[],
  onProgress?: (p: PdfProgress) => void,
): { promise: Promise<Blob>; cancel: () => void } {
  const worker = new Worker(new URL('../../workers/pdf.worker.ts', import.meta.url), {
    type: 'module',
  })

  const promise = new Promise<Blob>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const msg = event.data
      if (msg.type === 'progress') {
        onProgress?.({ phase: msg.phase, done: msg.done, total: msg.total })
      } else if (msg.type === 'done') {
        resolve(new Blob([msg.bytes], { type: 'application/pdf' }))
        worker.terminate()
      } else {
        reject(new Error(msg.message))
        worker.terminate()
      }
    }
    worker.onerror = (e) => {
      reject(new Error(e.message || 'The PDF worker failed unexpectedly.'))
      worker.terminate()
    }
    const request: GenerateRequest = { type: 'generate', slots, options, decklist }
    worker.postMessage(request)
  })

  return { promise, cancel: () => worker.terminate() }
}

/**
 * Opens a blank tab immediately, while the click is still being handled.
 *
 * Building the PDF takes several seconds, and a window.open() after an await has lost the user
 * gesture and is blocked by popup blockers. So the tab is claimed up front and given a holding
 * message, then pointed at the finished file.
 */
export function openPdfTab(): Window | null {
  const tab = window.open('', '_blank')
  if (!tab) return null
  tab.document.write(
    '<!doctype html><meta charset="utf-8"><title>Building your PDF...</title>' +
      '<body style="margin:0;display:grid;place-items:center;height:100vh;' +
      'font:15px ui-sans-serif,system-ui,sans-serif;color:#171717;background:#fff">' +
      '<p>Building your PDF, this tab will update when it is ready.</p></body>',
  )
  tab.document.close()
  return tab
}

/**
 * Shows the finished PDF. Uses the tab claimed at click time; if the browser refused it, falls
 * back to saving the file so the export is never simply lost.
 */
export function showPdf(blob: Blob, filename: string, tab: Window | null) {
  const url = URL.createObjectURL(blob)
  if (tab && !tab.closed) {
    tab.location.href = url
  } else {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.append(a)
    a.click()
    a.remove()
  }
  // Revoke late: the tab needs the URL alive long enough to load and render the document.
  setTimeout(() => URL.revokeObjectURL(url), 120_000)
}
