export interface ImageUris {
  small?: string
  normal?: string
  large?: string
  /** 744x1040 — exactly 300 DPI at 63x88mm, so it maps 1:1 onto a printed card. */
  png?: string
  art_crop?: string
  border_crop?: string
}

export interface CardFace {
  name: string
  type_line?: string
  mana_cost?: string
  image_uris?: ImageUris
}

export interface ScryfallCard {
  id: string
  oracle_id?: string
  name: string
  lang: string
  layout: string
  set: string
  set_name: string
  collector_number: string
  digital: boolean
  promo?: boolean
  released_at?: string
  finishes?: string[]
  frame_effects?: string[]
  border_color?: string
  type_line?: string
  image_uris?: ImageUris
  card_faces?: CardFace[]
  prints_search_uri?: string
  scryfall_uri?: string
}

export interface CardIdentifier {
  set?: string
  collector_number?: string
  name?: string
}

/** One physical thing to print: a single face of a single copy of a card. */
export interface PrintSlot {
  id: string
  entryKey: string
  name: string
  imageUrl: string
  face: 'front' | 'back'
}

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
