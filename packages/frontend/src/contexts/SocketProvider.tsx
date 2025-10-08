import type { ReactNode } from 'react';
import { useSocket } from '../hooks/useSocket';
import { SocketContext } from './SocketContext';

// Provider component - creates ONE socket for entire app
export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const socket = useSocket({ autoConnect: true });

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};