import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useRoomStore } from '../stores';
import { useGameStore } from '../stores';

interface RouteGuardProps {
  children?: React.ReactNode;
  requiresGameStart?: boolean;
}

const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const location = useLocation();
  const {
    roomCreationStatus,
    joinRoomStatus,
    roomCode,
    room,
    currentPlayerId,
    coPilotModeSelected,
  } = useRoomStore((s) => ({
    roomCreationStatus: s.roomCreationStatus,
    joinRoomStatus: s.joinRoomStatus,
    roomCode: s.roomCode,
    room: s.room,
    currentPlayerId: s.currentPlayerId,
    coPilotModeSelected: s.setup?.coPilotModeSelected,
  }));
  const gamePhase = useGameStore(s => s.gamePhase)

  const isRoomSetupComplete = coPilotModeSelected && (roomCreationStatus === 'success' || joinRoomStatus === 'success');
  const hasRoomAndPlayer = roomCode && room && currentPlayerId;

  if (location.pathname === '/' || location.pathname === '/room-setup') {
    return children || <Outlet />;
  }

  if (!isRoomSetupComplete || !hasRoomAndPlayer) {
    return <Navigate to="/room-setup" replace />;
  }

  return children || <Outlet />;
};

export default RouteGuard;
