import type { PlayerTile } from 'shared-types'

interface TileStoreState {
  playerHand: PlayerTile[]
  discardPile: PlayerTile[]
  exposedTiles: PlayerTile[]
  dealerHand: boolean

  // minimal setters used by UI
  setDealerHand: (v: boolean) => void
  setPlayerHand?: (tiles: PlayerTile[]) => void
  setExposedTiles?: (tiles: PlayerTile[]) => void
}

const tileState: TileStoreState = {
  playerHand: [],
  discardPile: [],
  exposedTiles: [],
  dealerHand: false,
  setDealerHand: (v: boolean) => { tileState.dealerHand = v },
}

export const useTileStore = Object.assign(
  (<T>(selector?: (s: TileStoreState) => T) => (selector ? selector(tileState) : tileState)) as <T>(selector?: (s: TileStoreState) => T) => T | TileStoreState,
  { getState: () => tileState }
)
