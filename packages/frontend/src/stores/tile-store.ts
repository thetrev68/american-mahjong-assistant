// Legacy placeholder for refactored store
type AnyFn = (...args: unknown[]) => unknown
interface StoreShape { [key: string]: unknown }

const state: StoreShape = {
  playerHand: [],
  discardPile: [],
  exposedTiles: {},
  dealerHand: false,
  setDealerHand: ((v: boolean) => { state.dealerHand = v }) as AnyFn,
}

export const useTileStore = Object.assign(
  ((selector?: (s: StoreShape) => unknown) => (selector ? selector(state) : state)) as <T>(selector?: (s: StoreShape) => T) => T | StoreShape,
  { getState: () => state }
)
