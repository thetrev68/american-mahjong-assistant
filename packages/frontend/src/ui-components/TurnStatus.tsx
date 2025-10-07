// Turn Status Component
// Compact turn indicator for Game Mode and other views

import React from 'react';
import { useGameStore } from '../stores';

interface TurnStatusProps {
  currentPlayerId?: string;
  showTurnNumber?: boolean;
  showDuration?: boolean;
  className?: string;
}

const TurnStatus: React.FC<TurnStatusProps> = ({
  currentPlayerId,
  showTurnNumber = true,
  showDuration = false,
  className = '',
}) => {
  const gameStore = useGameStore();

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const turnSelectors = {
    isGameActive: gameStore.isGameActive,
    turnNumber: gameStore.turnNumber,
    roundNumber: gameStore.roundNumber,
    currentWind: gameStore.currentWind,
    turnDuration: gameStore.turnDuration,
    currentPlayerName: gameStore.players.find(p => p.id === gameStore.currentPlayerId)?.name || 'No Player',
    isMyTurn: (id: string) => gameStore.currentPlayerId === id,
    nextPlayerName: gameStore.players.find(p => p.id === gameStore.turnOrder[(gameStore.turnOrder.indexOf(gameStore.currentPlayerId || '') + 1) % gameStore.turnOrder.length])?.name || 'No Player',
  };

  if (!turnSelectors.isGameActive) {
    return (
      <div className={`flex items-center space-x-2 text-gray-500 ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full" />
        <span className="text-sm">Game not started</span>
      </div>
    );
  }

  const isMyTurn = currentPlayerId ? turnSelectors.isMyTurn(currentPlayerId) : false;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Status Indicator */}
      <div className={`w-3 h-3 rounded-full ${
        isMyTurn ? 'bg-green-500' : 'bg-yellow-500'
      }`} />
      
      {/* Current Player */}
      <span className={`font-medium ${
        isMyTurn ? 'text-green-700' : 'text-gray-700'
      }`}>
        {isMyTurn ? 'Your Turn' : turnSelectors.currentPlayerName}
      </span>

      {/* Turn Number */}
      {showTurnNumber && (
        <span className="text-sm text-gray-500">
          T{turnSelectors.turnNumber}
        </span>
      )}

      {/* Round & Wind */}
      <span className="text-sm text-gray-500">
        R{turnSelectors.roundNumber} {turnSelectors.currentWind?.charAt(0).toUpperCase()}
      </span>

      {/* Turn Duration */}
      {showDuration && (
        <span className="text-sm text-gray-500">
          {formatDuration(turnSelectors.turnDuration)}
        </span>
      )}

      {/* Next Player Indicator */}
      {!isMyTurn && (
        <span className="text-xs text-gray-400">
          → {turnSelectors.nextPlayerName}
        </span>
      )}
    </div>
  );
};

export default TurnStatus;
