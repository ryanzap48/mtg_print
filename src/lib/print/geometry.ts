import type { CardGap, PaperSize } from './types'

export const MM_TO_PT = 72 / 25.4

/**
 * A Magic card is 63 x 88 mm. Note that the commonly quoted 2.5" x 3.5" is a rounding,
 * 63mm is 2.480", and printing at 2.5" makes cards visibly too wide for a sleeve.
 *
 * Scryfall's `png` image is 744 x 1040 px, which is exactly 300 DPI at this size
 * (744 / 2.480" = 300), so images map 1:1 with no upscaling.
 */
export const CARD_W_MM = 63
export const CARD_H_MM = 88

export const CARD_W_PT = CARD_W_MM * MM_TO_PT // 178.58
export const CARD_H_PT = CARD_H_MM * MM_TO_PT // 249.45

/** Keep clear of the non-printable edge that most consumer printers enforce. */
const MIN_MARGIN_MM = 5

/** Extra scale applied to the artwork when bleed is on, to hide slightly-off cuts. */
export const BLEED_SCALE = 1.02

export const PAPER_PT: Record<PaperSize, { w: number; h: number; label: string }> = {
  letter: { w: 8.5 * 72, h: 11 * 72, label: 'US Letter, 8.5 × 11 in' },
  a4: { w: 210 * MM_TO_PT, h: 297 * MM_TO_PT, label: 'A4, 210 × 297 mm' },
  legal: { w: 8.5 * 72, h: 14 * 72, label: 'US Legal, 8.5 × 14 in' },
  tabloid: { w: 11 * 72, h: 17 * 72, label: 'Tabloid, 11 × 17 in' },
  a3: { w: 297 * MM_TO_PT, h: 420 * MM_TO_PT, label: 'A3, 297 × 420 mm' },
  a5: { w: 148 * MM_TO_PT, h: 210 * MM_TO_PT, label: 'A5, 148 × 210 mm' },
}

export const PAPER_ORDER: PaperSize[] = ['letter', 'a4', 'legal', 'tabloid', 'a3', 'a5']

export interface PageGeometry {
  pageW: number
  pageH: number
  marginX: number
  marginY: number
  gridW: number
  gridH: number
  cols: number
  rows: number
  perSheet: number
  gap: number
}

/**
 * Fits as many whole cards as the sheet allows rather than assuming 3x3, so larger paper is
 * actually worth choosing: Letter and A4 hold 9, Tabloid and A3 hold 16.
 */
export function pageGeometry(paper: PaperSize, gapMm: CardGap = 0): PageGeometry {
  // An unrecognised paper size (stale storage, hand-edited value) must not blank the app.
  const { w: pageW, h: pageH } = PAPER_PT[paper] ?? PAPER_PT.letter
  const gap = gapMm * MM_TO_PT
  const usableW = pageW - 2 * MIN_MARGIN_MM * MM_TO_PT
  const usableH = pageH - 2 * MIN_MARGIN_MM * MM_TO_PT

  // n cards plus (n-1) gaps must fit, so add one gap to both sides of the division.
  const cols = Math.max(1, Math.floor((usableW + gap) / (CARD_W_PT + gap)))
  const rows = Math.max(1, Math.floor((usableH + gap) / (CARD_H_PT + gap)))

  const gridW = cols * CARD_W_PT + (cols - 1) * gap
  const gridH = rows * CARD_H_PT + (rows - 1) * gap

  return {
    pageW,
    pageH,
    gridW,
    gridH,
    cols,
    rows,
    perSheet: cols * rows,
    gap,
    marginX: (pageW - gridW) / 2,
    marginY: (pageH - gridH) / 2,
  }
}

/**
 * Bottom-left corner of the cell at `index` on a page, in PDF coordinates, which put the
 * origin at the bottom-left and grow upward.
 */
export function cellOrigin(geo: PageGeometry, index: number): { x: number; y: number } {
  const col = index % geo.cols
  const row = Math.floor(index / geo.cols)
  return {
    x: geo.marginX + col * (CARD_W_PT + geo.gap),
    y: geo.pageH - geo.marginY - (row + 1) * CARD_H_PT - row * geo.gap,
  }
}
