// Tile States - Visual state management for gameplay tiles
// Provides constants and utilities for tile state styling

export const TILE_STATES = {
  primary: 'primary',
  selected: 'selected', 
  exposed: 'exposed',
  locked: 'locked',
  placeholder: 'placeholder'
} as const

export type TileState = keyof typeof TILE_STATES

export const getTileStateClass = (state: TileState): string => {
  switch (state) {
    case 'primary':
      return 'ring-2 ring-inset ring-blue-500 ring-opacity-0 hover:ring-opacity-50 transition-all'
    case 'selected':
      return 'ring-2 ring-inset ring-purple-500 ring-opacity-80 scale-105 transform transition-all'
    case 'exposed':
      return 'ring-2 ring-inset ring-green-500 ring-opacity-60 opacity-80'
    case 'locked':
      return 'ring-2 ring-inset ring-red-500 ring-opacity-60 opacity-70 cursor-not-allowed'
    case 'placeholder':
      return 'ring-2 ring-inset ring-gray-400 ring-dashed opacity-50 bg-gray-100'
    default:
      return 'hover:ring-2 hover:ring-inset hover:ring-blue-300 transition-all'
  }
}