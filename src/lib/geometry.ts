import type { PaperSize } from './types'

export const MM_TO_PT = 72 / 25.4

/**
 * A Magic card is 63 x 88 mm. Note that the commonly quoted 2.5" x 3.5" is a rounding —
 * 63mm is 2.480", and printing at 2.5" makes cards visibly too wide for a sleeve.
 *
 * Scryfall's `png` image is 744 x 1040 px, which is exactly 300 DPI at this size
 * (744 / 2.480" = 300), so images map 1:1 with no upscaling.
 */
export const CARD_W_MM = 63
export const CARD_H_MM = 88

export const CARD_W_PT = CARD_W_MM * MM_TO_PT // 178.58
export const CARD_H_PT = CARD_H_MM * MM_TO_PT // 249.45

export const COLS = 3
export const ROWS = 3
export const CARDS_PER_SHEET = COLS * ROWS

export const PAPER_PT: Record<PaperSize, { w: number; h: number; label: string }> = {
  a4: { w: 210 * MM_TO_PT, h: 297 * MM_TO_PT, label: 'A4 (210 × 297 mm)' },
  letter: { w: 8.5 * 72, h: 11 * 72, label: 'US Letter (8.5 × 11 in)' },
}

/** Extra scale applied to the artwork when bleed is on, to hide slightly-off cuts. */
export const BLEED_SCALE = 1.02

export interface PageGeometry {
  pageW: number
  pageH: number
  marginX: number
  marginY: number
  gridW: number
  gridH: number
}

export function pageGeometry(paper: PaperSize): PageGeometry {
  const { w: pageW, h: pageH } = PAPER_PT[paper]
  const gridW = COLS * CARD_W_PT
  const gridH = ROWS * CARD_H_PT
  return {
    pageW,
    pageH,
    gridW,
    gridH,
    marginX: (pageW - gridW) / 2,
    marginY: (pageH - gridH) / 2,
  }
}

/**
 * Bottom-left corner of the cell at `index` (0-8) on a page, in PDF coordinates, which put
 * the origin at the bottom-left and grow upward.
 */
export function cellOrigin(geo: PageGeometry, index: number): { x: number; y: number } {
  const col = index % COLS
  const row = Math.floor(index / COLS)
  return {
    x: geo.marginX + col * CARD_W_PT,
    y: geo.pageH - geo.marginY - (row + 1) * CARD_H_PT,
  }
}
