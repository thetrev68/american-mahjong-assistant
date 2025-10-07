import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useRoomStore } from '../stores';

interface RouteGuardProps {
  children?: React.ReactNode;
}

const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const location = useLocation();
  const {
    coPilotModeSelected,
    roomCreationStatus,
    joinRoomStatus,
    roomCode,
    room,
    currentPlayerId,
  } = useRoomStore((s) => ({
    coPilotModeSelected: s.coPilotModeSelected,
    roomCreationStatus: s.roomCreationStatus,
    joinRoomStatus: s.joinRoomStatus,
    roomCode: s.roomCode,
    room: s.room,
    currentPlayerId: s.currentPlayerId,
  }));

  const isRoomSetupComplete = coPilotModeSelected && (roomCreationStatus === 'success' || joinRoomStatus === 'success');
  const hasRoomAndPlayer = roomCode && room && currentPlayerId;

  if (location.pathname === '/' || location.pathname === '/setup') {
    return children || <Outlet />;
  }

  if (!isRoomSetupComplete || !hasRoomAndPlayer) {
    return <Navigate to="/setup" replace />;
  }

  return children || <Outlet />;
};

export default RouteGuard;