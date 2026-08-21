import type { PrintOptions } from './types'
import type {
  CalibrationRequest,
  GenerateRequest,
  WorkerMessage,
  WorkerSlot,
} from '../../workers/pdf.worker'

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
export const CANCELLED = 'pdf-export-cancelled'

export function generatePdf(
  slots: WorkerSlot[],
  options: PrintOptions,
  decklist: string[],
  onProgress?: (p: PdfProgress) => void,
): { promise: Promise<Blob>; cancel: () => void } {
  const worker = new Worker(new URL('../../workers/pdf.worker.ts', import.meta.url), {
    type: 'module',
  })

  let rejectPromise: ((reason: Error) => void) | undefined
  const promise = new Promise<Blob>((resolve, reject) => {
    rejectPromise = reject
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

  return {
    promise,
    cancel: () => {
      // Terminating the worker fires no message, so settle the promise ourselves; otherwise
      // the awaiting caller would hang and never clear its progress state.
      rejectPromise?.(new Error(CANCELLED))
      worker.terminate()
    },
  }
}

/**
 * Weight of each phase in the overall progress bar. Downloading art dominates the wall clock,
 * so splitting evenly would make the bar stall at 33% and then leap to done.
 */
const PHASE_WEIGHT: Record<PdfProgress['phase'], { base: number; span: number }> = {
  download: { base: 0, span: 0.72 },
  embed: { base: 0.72, span: 0.16 },
  draw: { base: 0.88, span: 0.12 },
}

/** Overall completion 0..1, monotonically increasing across the three phases. */
function overallFraction(p: PdfProgress): number {
  const { base, span } = PHASE_WEIGHT[p.phase]
  const within = p.total > 0 ? Math.min(p.done / p.total, 1) : 0
  return Math.min(base + span * within, 1)
}

/**
 * Opens a blank tab immediately, while the click is still being handled.
 *
 * Building the PDF takes several seconds, and a window.open() after an await has lost the user
 * gesture and is blocked by popup blockers. So the tab is claimed up front and given a holding
 * page, which updatePdfTab() then drives, before being pointed at the finished file.
 */
/** One-page test sheet, built in the same worker so pdf-lib stays out of the main bundle. */
export function generateCalibrationPdf(options: PrintOptions): Promise<Blob> {
  const worker = new Worker(new URL('../../workers/pdf.worker.ts', import.meta.url), {
    type: 'module',
  })
  return new Promise<Blob>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const msg = event.data
      if (msg.type === 'done') {
        resolve(new Blob([msg.bytes], { type: 'application/pdf' }))
        worker.terminate()
      } else if (msg.type === 'error') {
        reject(new Error(msg.message))
        worker.terminate()
      }
    }
    worker.onerror = (e) => {
      reject(new Error(e.message || 'Could not build the calibration page.'))
      worker.terminate()
    }
    const request: CalibrationRequest = { type: 'calibration', options }
    worker.postMessage(request)
  })
}

export function openPdfTab(): Window | null {
  const tab = window.open('', '_blank')
  if (!tab) return null
  tab.document.write(`<!doctype html><meta charset="utf-8">
<title>Building your PDF...</title>
<style>
  :root { color-scheme: light }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center;
    background: #fff; color: #171717;
    font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .box { width: min(22rem, 84vw); text-align: center }
  h1 { font-size: 1rem; font-weight: 600; margin: 0 0 1rem }
  .track { height: 6px; border-radius: 999px; background: #e5e5e5; overflow: hidden }
  .fill { height: 100%; width: 0%; background: #171717; border-radius: 999px;
          transition: width .25s ease }
  .status { margin: .75rem 0 0; font-size: 12px; color: #737373;
            display: flex; justify-content: space-between; gap: 1rem }
</style>
<div class="box">
  <h1 id="pdf-title">Building your PDF...</h1>
  <div class="track" role="progressbar" aria-labelledby="pdf-title"
       aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="pdf-bar">
    <div class="fill" id="pdf-fill"></div>
  </div>
  <p class="status"><span id="pdf-phase">Starting</span><span id="pdf-pct">0%</span></p>
</div>`)
  tab.document.close()
  return tab
}

/** Pushes progress into the holding tab. Safe to call after the user has closed it. */
export function updatePdfTab(tab: Window | null, progress: PdfProgress) {
  if (!tab || tab.closed) return
  try {
    const doc = tab.document
    const pct = Math.round(overallFraction(progress) * 100)
    const fill = doc.getElementById('pdf-fill')
    const bar = doc.getElementById('pdf-bar')
    const phase = doc.getElementById('pdf-phase')
    const label = doc.getElementById('pdf-pct')
    if (fill) fill.style.width = `${pct}%`
    if (bar) bar.setAttribute('aria-valuenow', String(pct))
    if (phase) phase.textContent = progressLabel(progress)
    if (label) label.textContent = `${pct}%`
  } catch {
    // The tab may have been closed or navigated between the check and the write.
  }
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
