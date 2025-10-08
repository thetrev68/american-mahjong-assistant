import type { ReactNode } from 'react';
import { createContext } from 'react';
import { useSocket } from '../hooks/useSocket';

// Create socket context
export const SocketContext = createContext<ReturnType<typeof useSocket> | null>(null);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const socket = useSocket({ autoConnect: true });
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
