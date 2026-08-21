import { get, set, createStore } from 'idb-keyval'
import type { ScryfallCard } from './types'

/**
 * Scryfall card data is effectively immutable once printed, and images are served with
 * `cache-control: max-age=31556952`. Caching both in IndexedDB makes a repeat submit of the
 * same decklist resolve with zero network requests.
 */
const cardStore = createStore('mtg-print', 'cards')
const printsStore = createStore('mtg-print', 'prints')

export const cardKey = (setCode: string, collectorNumber: string) =>
  `${setCode.toLowerCase()}/${collectorNumber}`

export async function getCachedCard(key: string): Promise<ScryfallCard | undefined> {
  try {
    return await get<ScryfallCard>(key, cardStore)
  } catch {
    return undefined
  }
}

export async function putCachedCard(key: string, card: ScryfallCard): Promise<void> {
  try {
    await set(key, card, cardStore)
  } catch {
    // A full or unavailable IndexedDB must never break the app; the network still works.
  }
}

export async function getCachedPrints(oracleId: string): Promise<ScryfallCard[] | undefined> {
  try {
    return await get<ScryfallCard[]>(oracleId, printsStore)
  } catch {
    return undefined
  }
}

export async function putCachedPrints(oracleId: string, prints: ScryfallCard[]): Promise<void> {
  try {
    await set(oracleId, prints, printsStore)
  } catch {
    // ignore
  }
}
