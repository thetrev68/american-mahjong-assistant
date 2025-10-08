import { createContext } from 'react';
import { useSocket } from '../hooks/useSocket';

// Create socket context
export const SocketContext = createContext<ReturnType<typeof useSocket> | null>(null);
