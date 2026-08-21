import type { ScryfallCard } from '../scryfall/types'

/** One physical thing to print: a single face of a single copy of a card. */
export interface PrintSlot {
  id: string
  entryKey: string
  name: string
  imageUrl: string
  face: 'front' | 'back'
}

/** The image set for one face, or undefined if that face does not exist. */
function faceUris(card: ScryfallCard, face: Face) {
  if (face === 'front') return card.image_uris ?? card.card_faces?.[0]?.image_uris
  const faces = card.card_faces
  return faces && faces.length >= 2 ? faces[1]?.image_uris : undefined
}

export type Face = 'front' | 'back'

/**
 * Art for the PDF: Scryfall's `png` is 744x1040, exactly 300 DPI at 63x88mm, so it maps 1:1
 * onto a printed card. Never substitute a smaller variant here or the print loses resolution.
 */
export function printImage(card: ScryfallCard, face: Face = 'front'): string | undefined {
  const u = faceUris(card, face)
  return u?.png ?? u?.large
}

/**
 * Art for the screen. `normal` is 488px and ~67 KB against the PNG's 744px and ~370 KB, while
 * tiles render around 180px wide, so this is still roughly 2.8x the displayed size on a 3x
 * display. Using the print PNG here cost ~90 MB to draw a 97 card grid.
 */
export function displayImage(card: ScryfallCard, face: Face = 'front'): string | undefined {
  const u = faceUris(card, face)
  return u?.normal ?? u?.large ?? u?.png
}

/**
 * Art for the search-result pickers, which render up to 256px wide.
 *
 * `large` is 672px, so it still has pixels in hand on a 2x or 3x display. `small` is only
 * 146px and was being upscaled at these sizes, which is what made the pickers look blurry.
 */
export function pickerImage(card: ScryfallCard): string | undefined {
  const u = faceUris(card, 'front')
  return u?.large ?? u?.normal ?? u?.png
}

/**
 * A card has a genuinely separate printed back only when its second face carries its own
 * image. Testing for that image, rather than for a slash in the name or a layout whitelist, is
 * what keeps `adventure` (Ishgard, the Holy See / Faith & Grief) and `saga` (Urza's Saga) as
 * single cards while correctly splitting `transform`, `modal_dfc`, `double_faced_token` and
 * `reversible_card`.
 */
export function isDoubleFaced(card: ScryfallCard): boolean {
  return printImage(card, 'back') !== undefined
}

function faceName(card: ScryfallCard, face: Face): string {
  const faces = card.card_faces
  if (faces && faces.length >= 2) {
    return face === 'front' ? (faces[0]?.name ?? card.name) : (faces[1]?.name ?? card.name)
  }
  return card.name
}

export interface SlotSource {
  entryKey: string
  qty: number
  card: ScryfallCard
}

/**
 * Flattens the deck into the ordered list of images that will actually be printed: `qty`
 * copies of each card, with a double-faced card's back following immediately after its front
 * so the two land next to each other on the sheet.
 */
export function buildSlots(sources: SlotSource[]): PrintSlot[] {
  const slots: PrintSlot[] = []
  for (const { entryKey, qty, card } of sources) {
    const front = printImage(card, 'front')
    if (!front) continue
    const back = printImage(card, 'back')
    for (let copy = 0; copy < qty; copy++) {
      slots.push({
        id: `${entryKey}:${copy}:front`,
        entryKey,
        name: faceName(card, 'front'),
        imageUrl: front,
        face: 'front',
      })
      if (back) {
        slots.push({
          id: `${entryKey}:${copy}:back`,
          entryKey,
          name: faceName(card, 'back'),
          imageUrl: back,
          face: 'back',
        })
      }
    }
  }
  return slots
}

export function pageCount(slotCount: number, perSheet: number): number {
  return perSheet > 0 ? Math.ceil(slotCount / perSheet) : 0
}

/**
 * Basic lands, including the snow variants. Scryfall types them "Basic Land , Plains" and
 * "Basic Snow Land , Plains", so a leading "Basic" is the reliable test.
 */
export function isBasicLand(card: ScryfallCard): boolean {
  return /^basic\b/i.test(card.type_line ?? '')
}
