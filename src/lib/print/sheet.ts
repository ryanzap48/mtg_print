import { rgb } from '@cantoo/pdf-lib'
import {
  BLEED_SCALE,
  CARD_H_PT,
  CARD_W_PT,
  CARDS_PER_SHEET,
  COLS,
  MM_TO_PT,
  ROWS,
  cellOrigin,
  pageGeometry,
  type PageGeometry,
} from './geometry'
import type { PrintOptions } from './types'

const MARK_LEN = 4 * MM_TO_PT
const MARK_COLOR = rgb(0.55, 0.55, 0.55)
const MARK_THICKNESS = 0.25

/** Structural subset of pdf-lib's types, so this module stays testable and import-light. */
interface DrawablePage {
  drawImage(image: unknown, opts: { x: number; y: number; width: number; height: number }): void
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
 * Lays images out 3x3 per page at exactly 63 x 88 mm each. Kept free of fetching and encoding
 * so the placement maths can be exercised directly in tests.
 *
 * `images[i]` is the embedded image for `imageUrls[i]`; a missing entry leaves the cell blank
 * rather than shifting every later card into the wrong slot.
 */
export function composeSheet(
  pdf: Doc,
  imageUrls: string[],
  images: Map<string, unknown>,
  options: PrintOptions,
  onPage?: (done: number, total: number) => void,
): number {
  const geo = pageGeometry(options.paper)
  const pages = Math.ceil(imageUrls.length / CARDS_PER_SHEET)

  for (let p = 0; p < pages; p++) {
    const page = pdf.addPage([geo.pageW, geo.pageH])
    const pageUrls = imageUrls.slice(p * CARDS_PER_SHEET, (p + 1) * CARDS_PER_SHEET)

    pageUrls.forEach((url, i) => {
      const image = images.get(url)
      if (!image) return
      const { x, y } = cellOrigin(geo, i)
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

    // Guides go on top of the artwork. The cells are butted together, so every interior grid
    // line lies exactly on a shared card edge — drawn underneath, it would be completely
    // hidden by the cards (and more so with bleed on). `marks` sits in the margins and is
    // never covered either way, so both styles use the same order.
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

  for (let c = 0; c <= COLS; c++) {
    const x = geo.marginX + c * CARD_W_PT
    if (style === 'grid') line(x, bottom, x, top)
    else {
      line(x, top, x, Math.min(top + MARK_LEN, geo.pageH))
      line(x, bottom, x, Math.max(bottom - MARK_LEN, 0))
    }
  }
  for (let r = 0; r <= ROWS; r++) {
    const y = geo.pageH - geo.marginY - r * CARD_H_PT
    if (style === 'grid') line(left, y, right, y)
    else {
      line(Math.max(left - MARK_LEN, 0), y, left, y)
      line(right, y, Math.min(right + MARK_LEN, geo.pageW), y)
    }
  }
}
