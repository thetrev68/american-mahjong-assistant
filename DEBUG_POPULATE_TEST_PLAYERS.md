# Debug: populate-test-players Not Reaching Backend

## Issue
Frontend emits `populate-test-players` event but backend `socket.onAny()` doesn't catch it.

## Evidence

### Frontend Console Shows:
```
🎲 Emitting populate-test-players via wrapper
🔌 emit() called, event: populate-test-players socketRef.current: 6N1SHteAJDisB16PAAAD
🔌 ✅ emit WITHOUT callback completed for event: populate-test-players
```

### Backend Console Shows:
```
✅ populate-test-players IS in listener list after registration
🎯 CAUGHT EVENT on socket 6N1SHteAJDisB16PAAAD: create-room  ← Works!
[NO EVENT CAUGHT for populate-test-players]  ← Missing!
```

### Socket IDs Match
- Frontend: `6N1SHteAJDisB16PAAAD`
- Backend: `6N1SHteAJDisB16PAAAD`
- ✅ Same socket!

## Hypotheses

### 1. Event Lost in Transit (Socket.IO issue)
- Event emitted but not delivered
- Possible Socket.IO buffer issue
- Test: Add delay between create-room and populate-test-players

### 2. Event Name Mismatch
- Frontend emits: `populate-test-players`
- Backend listens: `populate-test-players`
- ✅ Names match, this is NOT the issue

### 3. Socket Reconnection
- Socket disconnects/reconnects between events
- Event sent on wrong socket
- Would see different socket IDs (we don't)

### 4. Error in Socket Wrapper
- `useSocket.ts` emit() has a bug
- Event never actually sent
- But other events (create-room, ping) work fine

## Tests to Run

### Test 1: Add Delay
**Location:** `RoomSetupView.tsx:handleAutoPosition()`

```typescript
const handleAutoPosition = async () => {
  // ... existing code ...

  console.log('🎲 Populating players via backend')
  console.log('⏱️ Waiting 1 second before emitting...')
  await new Promise(resolve => setTimeout(resolve, 1000))

  socket.emit('populate-test-players', { roomId })
}
```

### Test 2: Use Callback Instead
**Location:** `RoomSetupView.tsx:handleAutoPosition()`

```typescript
socket.emit('populate-test-players', { roomId }, (response) => {
  console.log('📨 Got callback response:', response)
})
```

### Test 3: Listen for ACK
Check if Socket.IO is configured to require acknowledgments.

### Test 4: Direct Socket Access
Bypass the wrapper:

```typescript
import { io } from 'socket.io-client'
const directSocket = io('http://localhost:5000')
directSocket.emit('populate-test-players', { roomId: '...' })
```

## Recommended Fix

Since `create-room` works fine but `populate-test-players` doesn't, and both use the same socket, the issue is likely:

**The populate event is being emitted too quickly after create-room.**

Socket.IO might still be processing the create-room response when populate is emitted, causing the event to be dropped.

### Quick Fix:
Add a small delay OR emit populate-test-players from WITHIN the room-created response handler:

```typescript
// In useMultiplayer.ts handleResponse
const handleResponse = (...args: unknown[]) => {
  const response = args[0] as { success: boolean; room?: Room }

  if (response.success && response.room) {
    // ... existing code ...

    // If in dev mode and auto-position was requested, emit now
    if (import.meta.env.DEV && shouldAutoPopulate) {
      socket.emit('populate-test-players', { roomId: response.room.id })
    }
  }
}
```

## Current Status
- ❌ Backend not receiving populate-test-players
- ✅ All other socket events work fine
- ✅ Socket IDs match
- ✅ Event names match
- ✅ Handler is registered

**Next Step:** Add 1-second delay before emitting populate-test-players to test if it's a timing issue.

## Progress Update (2025-10-09)

### What We Verified
- `create-room` flows end-to-end: frontend receives `room-created`, backend logs the event and emits back.
- Room IDs are 8-character uppercase values (server-generated); the 4-char code is UI-only and not used in server calls.
- The frontend emits `populate-test-players` on the same socket id used for `create-room`.
- When emitted from the app, the backend does NOT log receiving `populate-test-players`, and no ACK is observed on the client.
- A separate smoke client succeeds end-to-end (backend receives `populate-test-players`, adds players, emits `dev:players-populated`).

### Changes Implemented
- Frontend
  - Listen-before-emit for `room-created` and `room-joined` to prevent races: `packages/frontend/src/hooks/useMultiplayer.ts`.
  - Dev auto-emit of `populate-test-players` immediately after `room-created` for sequencing: `packages/frontend/src/hooks/useMultiplayer.ts`.
  - Added ACK callback logging for both auto and manual emits to confirm server receipt: `useMultiplayer.ts`, `packages/frontend/src/features/room-setup/RoomSetupView.tsx`.
  - Added dev-only client `onAny` logger to trace all incoming events: `packages/frontend/src/hooks/useSocket.ts`.
  - Disabled/destroyed legacy room-multiplayer service to avoid conflicting listeners and stubbed actions: `packages/frontend/src/hooks/useMultiplayer.ts`.
- Backend
  - Added unconditional handler for `populate-test-players` (not gated by NODE_ENV) with verbose logs and ACK support: `packages/backend/src/features/socket-communication/socket-handlers.ts`.
  - Added connection/registration logs to correlate socket ids and event listeners: `packages/backend/src/server.ts`.
- Tooling
  - Added a Socket.IO smoke test script to reproduce the exact flow out-of-app: `scripts/dev/socket-populate-smoke.mjs`.

### Results So Far
- Smoke script: PASS. Backend receives `populate-test-players`, adds players, and emits `dev:players-populated`.
- In-app: `populate-test-players` emits (auto + manual) show as sent, but:
  - No backend log for the event.
  - No ACK callback observed in frontend.
  - No `dev:players-populated` received by the frontend.
- Conclusion: The event is not reaching the server from the app, despite using the same connected socket immediately after a successful `create-room`.

### Outgoing Trace Findings
- Added dev-only outgoing tracer (monkey-patch of `socket.emit`) logs:
  - `client OUT: create-room ...` then `client onAny: room-created ...` (OK)
  - `client OUT: populate-test-players { roomId: <8-char> }` (both auto and manual)
  - No `client ACK for populate-test-players ...` seen
- Backend shows no `populate-test-players` receipt for those attempts.
- This confirms a transport drop of that specific event from the app context (not backend logic, not ID mapping), while other events (create-room) on the same socket work.

### Hypotheses (Updated)
- Client transport is dropping this specific event name from the app context (name-specific filtering or collision). Less likely but possible given smoke test passes.
- A listener or wrapper in-app is interfering with outbound emits for this event between provider boundaries (less likely given `create-room` works via same path).
- Not a room ID mapping issue (8-char id is used and valid, and server handler checks by `roomId`).

### Next Diagnostics
- After restart, capture whether ACK logs appear for both emits:
  - Auto (after `room-created`) and manual (from Auto Position).
  - If no ACK: confirm server never receives the event; proceed to emit an alternate diagnostic event name in parallel (dev-only) to isolate name-specific filtering.
  - If ACK success arrives but UI doesn’t update: verify `RoomSetupView.tsx` `socket.on('dev:players-populated', ...)` fires once and store updates propagate (Zustand store adapters after refactor).
- Keep verifying socket ids match between frontend and backend connection logs.

Additional high-signal checks (next session):
- Inspect WS frames in DevTools for `populate-test-players` right when Auto Position emits; if absent, emit didn’t leave the browser.
- Emit a trivial `test-event` immediately before populate in Auto Position to see if any event reaches backend at that moment.
- Optionally emit a parallel diagnostic event name (e.g., `dev:populate-players-alt`) to rule out name-specific filtering.

### Commands
- Run smoke test directly:
  - `BACKEND_URL=http://localhost:5000 node scripts/dev/socket-populate-smoke.mjs`

### Notes
- In Multiplayer mode, `create-room` adds only Trevor initially. The other three players (Kim, Jordan, Emilie) are added by `populate-test-players`. Seeing only Trevor in `create-room` logs is expected.
