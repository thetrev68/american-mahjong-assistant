// Lightweight smoke test for Socket.IO event flow
// Connects to backend, creates a room, then emits populate-test-players
// and prints whether dev:players-populated is received.

import { setTimeout as delay } from 'timers/promises'

// Import socket.io-client from root (workspace hoisted)
const { io } = await import('socket.io-client')

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000'

const log = (...args) => console.log('[smoke]', ...args)
const error = (...args) => console.error('[smoke]', ...args)

async function main() {
  log('Connecting to', BACKEND_URL)
  const socket = io(BACKEND_URL, { autoConnect: true, timeout: 10000 })

  const timeoutMs = 15000
  const abort = setTimeout(() => {
    error('Timed out waiting for events')
    try { socket.close() } catch {}
    process.exit(1)
  }, timeoutMs)

  socket.on('connect_error', (e) => {
    error('connect_error:', e?.message || e)
  })

  socket.onAny((event, ...args) => {
    log('onAny:', event, JSON.stringify(args))
  })

  socket.on('connect', async () => {
    log('Connected. socket.id =', socket.id)

    const hostName = 'SmokeHost'
    const payload = {
      hostName,
      config: {
        maxPlayers: 4,
        isPrivate: true,
        roomName: 'smoke-room',
        gameMode: 'nmjl-2025',
        hostName,
      },
    }

    log('Emitting create-room:', payload)
    socket.emit('create-room', payload)

    socket.once('room-created', async (resp) => {
      log('room-created:', resp)
      if (!resp?.success || !resp?.room?.id) {
        error('room-created unsuccessful or missing room')
        clearTimeout(abort)
        socket.close()
        process.exit(2)
        return
      }

      const roomId = resp.room.id
      log('Emitting populate-test-players for roomId:', roomId)
      socket.emit('populate-test-players', { roomId })

      socket.once('dev:players-populated', (pop) => {
        log('dev:players-populated:', pop)
        const ok = pop?.success === true && Array.isArray(pop?.players)
        clearTimeout(abort)
        socket.close()
        process.exit(ok ? 0 : 3)
      })

      // Also listen for room-updated as a secondary signal
      socket.once('room-updated', (u) => log('room-updated:', u?.room?.players?.length))
    })
  })
}

main().catch((e) => {
  error('Fatal error:', e)
  process.exit(10)
})
