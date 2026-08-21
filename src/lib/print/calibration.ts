import { rgb, StandardFonts, type PDFDocument } from '@cantoo/pdf-lib'
import { CARD_H_MM, CARD_H_PT, CARD_W_MM, CARD_W_PT, MM_TO_PT, PAPER_PT } from './geometry'
import type { PrintOptions } from './types'

const INK = rgb(0.09, 0.09, 0.09)
const MUTED = rgb(0.45, 0.45, 0.45)

/**
 * A single page for checking that a printer is not rescaling the sheet.
 *
 * Printing a full deck at the wrong scale wastes every page of it, and "Fit to page" is on by
 * default in a lot of print dialogs. One page, one measurement: if the box is 63 x 88 mm and
 * the ruler reads 100 mm, the real sheets will be right.
 */
export async function drawCalibrationPage(pdf: PDFDocument, options: PrintOptions) {
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const { w: pageW, h: pageH } = PAPER_PT[options.paper] ?? PAPER_PT.letter
  const page = pdf.addPage([pageW, pageH])
  const margin = 18 * MM_TO_PT

  let y = pageH - margin
  const text = (s: string, size: number, f = font, color = INK, dy = 0) => {
    y -= size + dy
    page.drawText(s, { x: margin, y, size, font: f, color })
  }

  text('Printer calibration', 18, bold)
  text('Print this one page before printing a deck.', 10, font, MUTED, 4)
  text('In the print dialog set Scale to "Actual size" or 100%, never "Fit to page".', 10, font, MUTED, 2)

  // The reference card outline, at exactly the size a real card is printed.
  y -= 18
  const cardY = y - CARD_H_PT
  page.drawRectangle({
    x: margin,
    y: cardY,
    width: CARD_W_PT,
    height: CARD_H_PT,
    borderColor: INK,
    borderWidth: 0.75,
  })
  page.drawText(`${CARD_W_MM} mm`, {
    x: margin + CARD_W_PT / 2 - 14,
    y: cardY - 12,
    size: 9,
    font,
    color: INK,
  })
  page.drawText(`${CARD_H_MM} mm`, {
    x: margin + CARD_W_PT + 6,
    y: cardY + CARD_H_PT / 2,
    size: 9,
    font,
    color: INK,
  })
  page.drawText('Measure this box. It is exactly one Magic card.', {
    x: margin + CARD_W_PT + 6,
    y: cardY + CARD_H_PT - 12,
    size: 9,
    font,
    color: MUTED,
  })
  page.drawText('If it measures smaller, your printer is scaling the page down.', {
    x: margin + CARD_W_PT + 6,
    y: cardY + CARD_H_PT - 26,
    size: 9,
    font,
    color: MUTED,
  })

  // A 100 mm ruler: easier to judge a scaling error over a longer run than a short one.
  const rulerY = cardY - 42
  const rulerLen = 100 * MM_TO_PT
  page.drawLine({
    start: { x: margin, y: rulerY },
    end: { x: margin + rulerLen, y: rulerY },
    thickness: 0.75,
    color: INK,
  })
  for (let mm = 0; mm <= 100; mm++) {
    const major = mm % 10 === 0
    if (!major && mm % 5 !== 0) continue
    const x = margin + mm * MM_TO_PT
    page.drawLine({
      start: { x, y: rulerY },
      end: { x, y: rulerY + (major ? 9 : 5) },
      thickness: major ? 0.75 : 0.4,
      color: INK,
    })
    if (major) {
      page.drawText(String(mm), { x: x - 4, y: rulerY - 11, size: 7, font, color: MUTED })
    }
  }
  page.drawText('This ruler is 100 mm end to end.', {
    x: margin,
    y: rulerY - 26,
    size: 9,
    font,
    color: MUTED,
  })

  const paperLabel = (PAPER_PT[options.paper] ?? PAPER_PT.letter).label
  page.drawText(`Paper: ${paperLabel}. Print at 100% scale.`, {
    x: margin,
    y: margin,
    size: 9,
    font,
    color: MUTED,
  })
}
