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
 * Runs the whole build in a worker so a 100-card deck (~35 MB of art to fetch, decode and
 * re-encode) never blocks the main thread.
 */
export function generatePdf(
  slots: WorkerSlot[],
  options: PrintOptions,
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
    const request: GenerateRequest = { type: 'generate', slots, options }
    worker.postMessage(request)
  })

  return { promise, cancel: () => worker.terminate() }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  // Revoke on the next tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
