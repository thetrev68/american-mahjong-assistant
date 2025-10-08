// Legacy placeholder for refactored store
type AnyFn = (...args: any[]) => any
interface StoreShape { [key: string]: any }

const state: StoreShape = {
  playerHand: [],
  discardPile: [],
  exposedTiles: {},
  dealerHand: false,
  setDealerHand: ((v: boolean) => { state.dealerHand = v }) as AnyFn,
}

export const useTileStore = Object.assign(
  ((selector?: (s: StoreShape) => any) => (selector ? selector(state) : state)) as AnyFn,
  { getState: () => state }
)
/* eslint-disable @typescript-eslint/no-explicit-any */
