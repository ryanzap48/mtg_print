import { CardTile } from './CardTile'
import type { DeckItem } from '../../hooks/useDeckResolution'
import type { ScryfallCard } from '../../lib/scryfall/types'

interface Props {
  items: DeckItem[]
  onVersionChange: (key: string, card: ScryfallCard) => void
}

export function DeckGrid({ items, onVersionChange }: Props) {
  return (
    // Two across on phones, three on anything wider. Fewer, bigger cards make the art
    // readable enough to actually judge a printing before committing it to paper.
    <ul data-deck-grid className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3">
      {items.map((item, index) => (
        <CardTile
          key={item.key}
          index={index}
          card={item.card}
          qty={item.qty}
          onVersionChange={(card) => onVersionChange(item.key, card)}
        />
      ))}
    </ul>
  )
}
