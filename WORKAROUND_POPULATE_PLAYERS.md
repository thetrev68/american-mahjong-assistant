# Workaround: Skip Backend for populate-test-players

Since the Socket.IO event `populate-test-players` is mysteriously not reaching the backend despite all debugging showing it should work, here's a workaround:

## Option 1: Use Solo Mode (Recommended)

Solo mode creates all 4 players on the frontend without needing the backend.

**Change in RoomSetupView.tsx:**
- Switch co-pilot mode to "Solo" instead of "Multiplayer"
- Click "Fill Test Data"
- All 4 players (Trevor, Kim, Jordan, Emilie) are created locally
- No backend communication needed

## Option 2: Create HTTP Endpoint (If you need backend)

Add a REST endpoint as a fallback:

### Backend: `packages/backend/src/server.ts`
```typescript
// Add after other endpoints
app.post('/dev/populate-players', async (req, res) => {
  const { roomId } = req.body;

  try {
    const room = roomManager.getRoom(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const testPlayerNames = ['Kim', 'Jordan', 'Emilie'];
    const positions = ['east', 'south', 'west', 'north'] as const;

    for (let i = 0; i < 3; i++) {
      const aiPlayer = {
        id: `player-${i + 2}-${Date.now()}`,
        name: testPlayerNames[i],
        position: positions[i + 1],
        isHost: false,
        isReady: true,
        isConnected: true
      };
      room.players.push(aiPlayer);
    }

    io.to(roomId).emit('room-updated', { room });
    res.json({ success: true, room });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Frontend: `packages/frontend/src/features/room-setup/RoomSetupView.tsx`
```typescript
const handleAutoPosition = async () => {
  // ... existing code ...

  console.log('🎲 Populating players via HTTP fallback');
  try {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/dev/populate-players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId })
    });

    const data = await response.json();
    if (data.success) {
      console.log('✅ Players populated via HTTP');
      useMultiplayerStore.getState().setCurrentRoom(data.room);
    }
  } catch (error) {
    console.error('❌ HTTP populate failed:', error);
  }
};
```

## Option 3: Debug with Socket.IO Inspector

Install Socket.IO inspector to see what's actually being sent:

```bash
npm install socket.io-client-inspector
```

Then wrap the socket:
```typescript
import { inspect } from 'socket.io-client-inspector';
const socket = inspect(io(...));
```

This will log ALL Socket.IO traffic in detail.

## Recommended: Use Solo Mode Now

For immediate unblocking, I recommend switching to Solo mode:
1. Clear sessionStorage
2. Refresh page
3. Select "Solo" mode
4. Click "Fill Test Data"
5. Continue testing the rest of the app

We can debug the Socket.IO issue separately as it's blocking but not critical for testing other features.
