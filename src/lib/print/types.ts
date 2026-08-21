export type PaperSize = 'letter' | 'a4' | 'legal' | 'tabloid' | 'a3' | 'a5'
export type Quality = 'jpeg' | 'png'
export type CutMarkStyle = 'none' | 'marks' | 'grid'
/** Gap between cards, in millimetres. */
export type CardGap = 0 | 0.2 | 0.3 | 1

export interface PrintOptions {
  paper: PaperSize
  cutMarks: CutMarkStyle
  bleed: boolean
  quality: Quality
  /** Fill the transparent rounded corners with black instead of leaving them paper-white. */
  blackCorners: boolean
  /** Leave basic lands out of the PDF; most players already own plenty. */
  skipBasicLands: boolean
  /** Append a text page listing the decklist. */
  printDecklist: boolean
  gapMm: CardGap
}

export const DEFAULT_PRINT_OPTIONS: PrintOptions = {
  paper: 'letter',
  cutMarks: 'marks',
  bleed: false,
  quality: 'jpeg',
  blackCorners: false,
  skipBasicLands: false,
  printDecklist: false,
  gapMm: 0,
}
