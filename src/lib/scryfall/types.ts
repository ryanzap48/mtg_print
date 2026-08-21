/** Subset of Scryfall's card object that this app relies on. */

export interface ImageUris {
  small?: string
  normal?: string
  large?: string
  /** 744x1040, exactly 300 DPI at 63x88mm, so it maps 1:1 onto a printed card. */
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

/** How a card is addressed in a POST /cards/collection lookup. */
export interface CardIdentifier {
  set?: string
  collector_number?: string
  name?: string
}
