/// <reference lib="webworker" />
import { PDFDocument, StandardFonts, rgb } from '@cantoo/pdf-lib'
import { MM_TO_PT, PAPER_PT, pageGeometry } from '../lib/print/geometry'
import { composeSheet } from '../lib/print/sheet'
import type { PrintOptions } from '../lib/print/types'

export interface WorkerSlot {
  imageUrl: string
  /** Used to flood JPEG's missing alpha channel where the PNG has transparent corners. */
  borderColor?: string
}

export interface GenerateRequest {
  type: 'generate'
  slots: WorkerSlot[]
  options: PrintOptions
  /** Lines for the optional decklist page, already formatted for display. */
  decklist: string[]
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
      bytes.byteOffset + bytes.byteLength) as ArrayBuffer
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
  decklist,
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
        : { data: await toJpeg(blob, borderByUrl.get(url)), kind: 'jpeg' })
    downloaded++
    post({ type: 'progress', phase: 'download', done: downloaded, total: uniqueUrls.length })
  })

  const pdf = await PDFDocument.create()
  pdf.setTitle('MTG Print Proxy | proxy sheet')
  pdf.setCreator('MTG Print')

  const images = new Map<string, unknown>()
  let embedded = 0
  post({ type: 'progress', phase: 'embed', done: 0, total: uniqueUrls.length })
  for (const url of uniqueUrls) {
    const entry = encoded.get(url)!
    images.set(
      url,
      entry.kind === 'png' ? await pdf.embedPng(entry.data) : await pdf.embedJpg(entry.data))
    embedded++
    post({ type: 'progress', phase: 'embed', done: embedded, total: uniqueUrls.length })
  }

  const perSheet = pageGeometry(options.paper, options.gapMm).perSheet
  post({ type: 'progress', phase: 'draw', done: 0, total: Math.ceil(imageUrls.length / perSheet) })
  const pages = composeSheet(pdf, imageUrls, images, options, (done, total) =>
    post({ type: 'progress', phase: 'draw', done, total }),
  )

  if (options.printDecklist && decklist.length) {
    await drawDecklist(pdf, decklist, options)
  }

  return { bytes: await pdf.save(), pages }
}

/**
 * Appends a plain text listing of the deck, flowed into as many columns and pages as it needs.
 * Handy as a cut-and-keep reference sheet, and for checking the printout against the source.
 */
async function drawDecklist(
  pdf: PDFDocument,
  lines: string[],
  options: PrintOptions,
): Promise<void> {
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const { w: pageW, h: pageH } = PAPER_PT[options.paper]
  const margin = 15 * MM_TO_PT
  const size = 9
  const leading = size * 1.45
  const heading = 'Decklist'
  const headingSize = 14

  const colW = 62 * MM_TO_PT
  const cols = Math.max(1, Math.floor((pageW - 2 * margin) / colW))
  const top = pageH - margin
  const subtitleY = top - headingSize - 14
  // Leave a full line of air under the subtitle, otherwise the first row sits on top of it.
  const bodyTop = subtitleY - 20
  const rowsPerCol = Math.max(1, Math.floor((bodyTop - margin) / leading))
  const perPage = cols * rowsPerCol

  for (let start = 0; start < lines.length; start += perPage) {
    const page = pdf.addPage([pageW, pageH])
    page.drawText(heading, { x: margin, y: top - headingSize, size: headingSize, font: bold })
    page.drawText(`${lines.length} cards`, {
      x: margin,
      y: subtitleY,
      size: 8,
      font,
      color: rgb(0.45, 0.45, 0.45),
    })

    lines.slice(start, start + perPage).forEach((line, i) => {
      const col = Math.floor(i / rowsPerCol)
      const row = i % rowsPerCol
      page.drawText(sanitize(line), {
        x: margin + col * colW,
        y: bodyTop - row * leading,
        size,
        font,
        color: rgb(0.1, 0.1, 0.1),
      })
    })
  }
}

/** StandardFonts are WinAnsi-encoded and throw on characters outside that range. */
function sanitize(text: string): string {
  return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')
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
