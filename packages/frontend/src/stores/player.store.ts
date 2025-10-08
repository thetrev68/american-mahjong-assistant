// Legacy placeholder for refactored store
type AnyFn = (...args: unknown[]) => unknown
interface StoreShape { [key: string]: unknown }

const state: StoreShape = {
  activePlayerId: null,
  setPlayerPosition: (() => {}) as AnyFn,
}

export const usePlayerStore = Object.assign(
  ((selector?: (s: StoreShape) => unknown) => (selector ? selector(state) : state)) as <T>(selector?: (s: StoreShape) => T) => T | StoreShape,
  { getState: () => state }
)
