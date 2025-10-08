// Legacy placeholder for refactored store
type AnyFn = (...args: unknown[]) => unknown
interface StoreShape { [key: string]: unknown }

const state: StoreShape = {
  coPilotMode: 'solo',
  currentStep: 0,
  setCoPilotMode: (() => {}) as AnyFn,
  nextStep: (() => {}) as AnyFn,
  prevStep: (() => {}) as AnyFn,
  getRoomSetupProgress: () => ({ currentStep: 'ready' as const })
}

export const useRoomSetupStore = Object.assign(
  ((selector?: (s: StoreShape) => unknown) => (selector ? selector(state) : state)) as <T>(selector?: (s: StoreShape) => T) => T | StoreShape,
  { getState: () => state }
)
