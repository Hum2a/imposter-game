/** Curated word pairs per pack. IDs must match `src/data/word-pack-options.ts` for the client UI. */

export type WordPack = {
  id: string
  label: string
  pairs: [string, string][]
}

export const DEFAULT_WORD_PACK_ID = 'classic'

const classic: [string, string][] = [
  ['Pizza', 'Burger'],
  ['Cat', 'Dog'],
  ['Beach', 'Pool'],
  ['Coffee', 'Tea'],
  ['Football', 'Rugby'],
  ['Guitar', 'Piano'],
  ['Shark', 'Dolphin'],
  ['Skiing', 'Snowboarding'],
  ['Lemon', 'Lime'],
  ['Castle', 'Mansion'],
  ['Sword', 'Axe'],
  ['Mars', 'Moon'],
]

const food: [string, string][] = [
  ['Sushi', 'Sashimi'],
  ['Taco', 'Burrito'],
  ['Ramen', 'Pho'],
  ['Croissant', 'Bagel'],
  ['Ice cream', 'Gelato'],
  ['Apple', 'Pear'],
  ['Steak', 'Salmon'],
  ['Muffin', 'Donut'],
]

const nature: [string, string][] = [
  ['Thunder', 'Lightning'],
  ['River', 'Lake'],
  ['Forest', 'Jungle'],
  ['Sunrise', 'Sunset'],
  ['Volcano', 'Geyser'],
  ['Eagle', 'Hawk'],
  ['Rose', 'Tulip'],
  ['Winter', 'Autumn'],
]

const games: [string, string][] = [
  ['Chess', 'Checkers'],
  ['Mario', 'Sonic'],
  ['Fortnite', 'Minecraft'],
  ['Poker', 'Blackjack'],
  ['Basketball', 'Volleyball'],
  ['Racing', 'Platformer'],
]

export const WORD_PACKS: Record<string, WordPack> = {
  classic: { id: 'classic', label: 'Classic mix', pairs: classic },
  food: { id: 'food', label: 'Food & drinks', pairs: food },
  nature: { id: 'nature', label: 'Nature', pairs: nature },
  games: { id: 'games', label: 'Games & sports', pairs: games },
}

export function getWordPack(packId: string): WordPack {
  return WORD_PACKS[packId] ?? WORD_PACKS[DEFAULT_WORD_PACK_ID]!
}

export function isValidPackId(packId: string): boolean {
  return packId in WORD_PACKS
}
