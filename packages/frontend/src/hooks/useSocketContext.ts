
import { useContext } from 'react';
import { SocketContext } from '../contexts/SocketContext';


// Hook to use the socket - throws error if used outside provider
export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within SocketProvider');
  }
  return context;
};
