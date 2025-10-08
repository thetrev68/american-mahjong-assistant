// Legacy placeholder for refactored store
type AnyFn = (...args: unknown[]) => unknown
interface StoreShape { [key: string]: unknown }

const state: StoreShape = {
  completedGames: [],
  addCompletedGame: (() => {}) as AnyFn,
}

export const useHistoryStore = Object.assign(
  ((selector?: (s: StoreShape) => unknown) => (selector ? selector(state) : state)) as <T>(selector?: (s: StoreShape) => T) => T | StoreShape,
  { getState: () => state }
)
