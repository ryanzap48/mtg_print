/// <reference lib="webworker" />
import { PDFDocument } from '@cantoo/pdf-lib'
import { CARDS_PER_SHEET } from '../lib/geometry'
import { composeSheet } from '../lib/sheet'
import type { PrintOptions } from '../lib/types'

export interface WorkerSlot {
  imageUrl: string
  /** Used to flood JPEG's missing alpha channel where the PNG has transparent corners. */
  borderColor?: string
}

export interface GenerateRequest {
  type: 'generate'
  slots: WorkerSlot[]
  options: PrintOptions
}

export type WorkerMessage =
  | { type: 'progress'; phase: 'download' | 'embed' | 'draw'; done: number; total: number }
  | { type: 'done'; bytes: ArrayBuffer; pages: number }
  | { type: 'error'; message: string }

const CONCURRENCY = 6
const JPEG_QUALITY = 0.92

self.onmessage = async (event: MessageEvent<GenerateRequest>) => {
  if (event.data?.type !== 'generate') return
  try {
    const { bytes, pages } = await generate(event.data)
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer
    post({ type: 'done', bytes: buffer, pages }, [buffer])
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}

function post(message: WorkerMessage, transfer: Transferable[] = []) {
  ;(self as unknown as Worker).postMessage(message, transfer)
}

async function generate({
  slots,
  options,
}: GenerateRequest): Promise<{ bytes: Uint8Array; pages: number }> {
  // The same artwork is often needed many times (4x a basic land, a repeated staple).
  // Downloading and embedding each unique URL once and drawing it N times keeps both the
  // network cost and the PDF size proportional to distinct art rather than to card count.
  const imageUrls = slots.map((s) => s.imageUrl)
  const uniqueUrls = [...new Set(imageUrls)]
  const borderByUrl = new Map(slots.map((s) => [s.imageUrl, s.borderColor]))

  const encoded = new Map<string, { data: Uint8Array; kind: 'png' | 'jpeg' }>()
  let downloaded = 0
  post({ type: 'progress', phase: 'download', done: 0, total: uniqueUrls.length })

  await inParallel(uniqueUrls, CONCURRENCY, async (url) => {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) throw new Error(`Could not download card art (HTTP ${res.status}).`)
    const blob = await res.blob()
    encoded.set(
      url,
      options.quality === 'png'
        ? { data: new Uint8Array(await blob.arrayBuffer()), kind: 'png' }
        : { data: await toJpeg(blob, borderByUrl.get(url)), kind: 'jpeg' },
    )
    downloaded++
    post({ type: 'progress', phase: 'download', done: downloaded, total: uniqueUrls.length })
  })

  const pdf = await PDFDocument.create()
  pdf.setTitle('MTG Print — proxy sheet')
  pdf.setCreator('MTG Print')

  const images = new Map<string, unknown>()
  let embedded = 0
  post({ type: 'progress', phase: 'embed', done: 0, total: uniqueUrls.length })
  for (const url of uniqueUrls) {
    const entry = encoded.get(url)!
    images.set(
      url,
      entry.kind === 'png' ? await pdf.embedPng(entry.data) : await pdf.embedJpg(entry.data),
    )
    embedded++
    post({ type: 'progress', phase: 'embed', done: embedded, total: uniqueUrls.length })
  }

  post({
    type: 'progress',
    phase: 'draw',
    done: 0,
    total: Math.ceil(imageUrls.length / CARDS_PER_SHEET),
  })
  const pages = composeSheet(pdf, imageUrls, images, options, (done, total) =>
    post({ type: 'progress', phase: 'draw', done, total }),
  )

  return { bytes: await pdf.save(), pages }
}

/**
 * Re-encodes card art as JPEG, roughly a third the size of Scryfall's PNG. The canvas is
 * flooded with the card's border colour first: JPEG has no alpha channel, and the source PNGs
 * have transparent rounded corners that would otherwise composite to an unpredictable colour.
 */
async function toJpeg(blob: Blob, borderColor: string | undefined): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(blob)
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create a drawing context for image conversion.')
  ctx.fillStyle = borderColor === 'white' || borderColor === 'silver' ? '#ffffff' : '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  const out = await canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY })
  return new Uint8Array(await out.arrayBuffer())
}

async function inParallel<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      await fn(items[cursor++])
    }
  })
  await Promise.all(workers)
}
