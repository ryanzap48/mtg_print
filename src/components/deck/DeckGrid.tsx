import { CardTile } from './CardTile'
import type { DeckItem } from '../../hooks/useDeckResolution'
import type { ScryfallCard } from '../../lib/scryfall/types'

interface Props {
  items: DeckItem[]
  onVersionChange: (key: string, card: ScryfallCard) => void
}

export function DeckGrid({ items, onVersionChange }: Props) {
  return (
    <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item) => (
        <CardTile
          key={item.key}
          card={item.card}
          qty={item.qty}
          onVersionChange={(card) => onVersionChange(item.key, card)}
        />
      ))}
    </ul>
  )
}
