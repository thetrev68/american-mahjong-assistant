// Legacy placeholder for refactored store
type AnyFn = (...args: any[]) => any
interface StoreShape { [key: string]: any }

const state: StoreShape = {
  completedGames: [],
  addCompletedGame: (() => {}) as AnyFn,
}

export const useHistoryStore = Object.assign(
  ((selector?: (s: StoreShape) => any) => (selector ? selector(state) : state)) as AnyFn,
  { getState: () => state }
)
/* eslint-disable @typescript-eslint/no-explicit-any */
