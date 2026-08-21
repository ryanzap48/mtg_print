import { rgb } from '@cantoo/pdf-lib'
import {
  BLEED_SCALE,
  CARD_H_PT,
  CARD_W_PT,
  MM_TO_PT,
  cellOrigin,
  pageGeometry,
  type PageGeometry,
} from './geometry'
import type { PrintOptions } from './types'

const MARK_LEN = 4 * MM_TO_PT
const MARK_COLOR = rgb(0.55, 0.55, 0.55)
const MARK_THICKNESS = 0.25
const BLACK = rgb(0, 0, 0)

/** Structural subset of pdf-lib's types, so this module stays testable and import-light. */
interface DrawablePage {
  drawImage(image: unknown, opts: { x: number; y: number; width: number; height: number }): void
  drawRectangle(opts: {
    x: number
    y: number
    width: number
    height: number
    color: ReturnType<typeof rgb>
  }): void
  drawLine(opts: {
    start: { x: number; y: number }
    end: { x: number; y: number }
    thickness: number
    color: ReturnType<typeof rgb>
  }): void
}
interface Doc {
  addPage(size: [number, number]): DrawablePage
}

/**
 * Lays images out at exactly 63 x 88 mm each, as many per sheet as the paper allows. Kept free
 * of fetching and encoding so the placement maths can be exercised directly in tests.
 *
 * `images` maps an image URL to its embedded PDF image; a missing entry leaves the cell blank
 * rather than shifting every later card into the wrong slot.
 */
export function composeSheet(
  pdf: Doc,
  imageUrls: string[],
  images: Map<string, unknown>,
  options: PrintOptions,
  onPage?: (done: number, total: number) => void,
): number {
  const geo = pageGeometry(options.paper, options.gapMm)
  const pages = Math.ceil(imageUrls.length / geo.perSheet)

  for (let p = 0; p < pages; p++) {
    const page = pdf.addPage([geo.pageW, geo.pageH])
    const pageUrls = imageUrls.slice(p * geo.perSheet, (p + 1) * geo.perSheet)

    pageUrls.forEach((url, i) => {
      const image = images.get(url)
      if (!image) return
      const { x, y } = cellOrigin(geo, i)

      // Scryfall art has transparent rounded corners. Painting the cell black first makes a
      // straight cut look like a black-bordered card instead of showing paper white.
      if (options.blackCorners) {
        page.drawRectangle({ x, y, width: CARD_W_PT, height: CARD_H_PT, color: BLACK })
      }

      if (options.bleed) {
        const w = CARD_W_PT * BLEED_SCALE
        const h = CARD_H_PT * BLEED_SCALE
        page.drawImage(image, {
          x: x - (w - CARD_W_PT) / 2,
          y: y - (h - CARD_H_PT) / 2,
          width: w,
          height: h,
        })
      } else {
        page.drawImage(image, { x, y, width: CARD_W_PT, height: CARD_H_PT })
      }
    })

    // Guides go on top of the artwork. With no gap every interior grid line lies exactly on a
    // shared card edge, so drawn underneath it would be completely hidden by the cards.
    if (options.cutMarks !== 'none') drawCutMarks(page, geo, options.cutMarks)

    onPage?.(p + 1, pages)
  }

  return pages
}

/**
 * `marks` keeps every line in the page margin so no ink lands on a card; `grid` runs the lines
 * across the whole sheet, which is easier to follow with a guillotine trimmer.
 */
export function drawCutMarks(page: DrawablePage, geo: PageGeometry, style: 'marks' | 'grid') {
  const top = geo.pageH - geo.marginY
  const bottom = geo.marginY
  const left = geo.marginX
  const right = geo.marginX + geo.gridW
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: MARK_THICKNESS,
      color: MARK_COLOR,
    })

  // With a gap there are two cut lines per interior boundary, one per adjacent card edge.
  const xs: number[] = []
  for (let c = 0; c < geo.cols; c++) {
    const cellX = geo.marginX + c * (CARD_W_PT + geo.gap)
    xs.push(cellX, cellX + CARD_W_PT)
  }
  const ys: number[] = []
  for (let r = 0; r < geo.rows; r++) {
    const cellTop = geo.pageH - geo.marginY - r * (CARD_H_PT + geo.gap)
    ys.push(cellTop, cellTop - CARD_H_PT)
  }

  for (const x of [...new Set(xs)]) {
    if (style === 'grid') line(x, bottom, x, top)
    else {
      line(x, top, x, Math.min(top + MARK_LEN, geo.pageH))
      line(x, bottom, x, Math.max(bottom - MARK_LEN, 0))
    }
  }
  for (const y of [...new Set(ys)]) {
    if (style === 'grid') line(left, y, right, y)
    else {
      line(Math.max(left - MARK_LEN, 0), y, left, y)
      line(right, y, Math.min(right + MARK_LEN, geo.pageW), y)
    }
  }
}
