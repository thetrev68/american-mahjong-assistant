import { createContext, useContext, ReactNode } from 'react'
import { useSocket } from '../hooks/useSocket'

// Create socket context
const SocketContext = createContext<ReturnType<typeof useSocket> | null>(null)

// Provider component - creates ONE socket for entire app
export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const socket = useSocket({ autoConnect: true })

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  )
}

// Hook to use the socket - throws error if used outside provider
export const useSocketContext = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocketContext must be used within SocketProvider')
  }
  return context
}
