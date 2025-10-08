// Legacy placeholder for refactored store
type AnyFn = (...args: any[]) => any
interface StoreShape { [key: string]: any }

const state: StoreShape = {
  coPilotMode: 'solo',
  currentStep: 0,
  setCoPilotMode: (() => {}) as AnyFn,
  nextStep: (() => {}) as AnyFn,
  prevStep: (() => {}) as AnyFn,
}

export const useRoomSetupStore = Object.assign(
  ((selector?: (s: StoreShape) => any) => (selector ? selector(state) : state)) as AnyFn,
  { getState: () => state }
)
/* eslint-disable @typescript-eslint/no-explicit-any */
