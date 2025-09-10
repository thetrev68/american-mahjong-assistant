/**
 * @deprecated - Compatibility export for the old room-store
 * 
 * This file re-exports the deprecated room store to maintain compatibility
 * while components are being migrated to the new decomposed stores.
 * 
 * Please use the new stores instead:
 * - useRoomStore: Core room data and server state
 * - usePlayerStore: Local player positioning and identity  
 * - useConnectionStore: Socket connection management
 * - useRoomSetupStore: UI state for room setup flow
 */

export * from './room-store.deprecated';