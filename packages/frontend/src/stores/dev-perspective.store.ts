// Legacy placeholder for refactored store
interface StoreShape { [key: string]: unknown }

const state: StoreShape = {
  activeDevPlayerId: null,
  allPlayerIds: [],
}

export const useDevPerspectiveStore = Object.assign(
  ((selector?: (s: StoreShape) => unknown) => (selector ? selector(state) : state)) as <T>(selector?: (s: StoreShape) => T) => T | StoreShape,
  { getState: () => state }
)
