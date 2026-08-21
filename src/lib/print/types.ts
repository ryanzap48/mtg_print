export type PaperSize = 'a4' | 'letter'
export type Quality = 'jpeg' | 'png'
export type CutMarkStyle = 'none' | 'marks' | 'grid'

export interface PrintOptions {
  paper: PaperSize
  cutMarks: CutMarkStyle
  bleed: boolean
  quality: Quality
}

export const DEFAULT_PRINT_OPTIONS: PrintOptions = {
  paper: 'letter',
  cutMarks: 'marks',
  bleed: false,
  quality: 'jpeg',
}
