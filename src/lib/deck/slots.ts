import { CARDS_PER_SHEET } from '../print/geometry'
import type { ScryfallCard } from '../scryfall/types'

/** One physical thing to print: a single face of a single copy of a card. */
export interface PrintSlot {
  id: string
  entryKey: string
  name: string
  imageUrl: string
  face: 'front' | 'back'
}

/**
 * A card has a genuinely separate printed back only when its second face carries its own
 * image. Testing for that image — rather than for a slash in the name or a layout whitelist —
 * is what keeps `adventure` (Ishgard, the Holy See / Faith & Grief) and `saga` (Urza's Saga)
 * as single cards while correctly splitting `transform`, `modal_dfc`, `double_faced_token`
 * and `reversible_card`.
 */
export function backImage(card: ScryfallCard): string | undefined {
  const faces = card.card_faces
  if (!faces || faces.length < 2) return undefined
  return faces[1]?.image_uris?.png ?? faces[1]?.image_uris?.large
}

export function frontImage(card: ScryfallCard): string | undefined {
  return (
    card.image_uris?.png ??
    card.image_uris?.large ??
    card.card_faces?.[0]?.image_uris?.png ??
    card.card_faces?.[0]?.image_uris?.large
  )
}

export function isDoubleFaced(card: ScryfallCard): boolean {
  return backImage(card) !== undefined
}

export function faceName(card: ScryfallCard, face: 'front' | 'back'): string {
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
    const front = frontImage(card)
    if (!front) continue
    const back = backImage(card)
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

export function pageCount(slotCount: number): number {
  return Math.ceil(slotCount / CARDS_PER_SHEET)
}
