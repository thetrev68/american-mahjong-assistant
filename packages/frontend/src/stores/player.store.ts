// Legacy placeholder for refactored store
type AnyFn = (...args: any[]) => any
interface StoreShape { [key: string]: any }

const state: StoreShape = {
  activePlayerId: null,
  setPlayerPosition: (() => {}) as AnyFn,
}

export const usePlayerStore = Object.assign(
  ((selector?: (s: StoreShape) => any) => (selector ? selector(state) : state)) as AnyFn,
  { getState: () => state }
)
/* eslint-disable @typescript-eslint/no-explicit-any */
