// Turn Management Panel Component
// Real-time turn tracking and controls for 4-player American Mahjong

import React from 'react';
import type { Player } from '@shared-types/game-types';
import { useGameStore } from '../stores';
import { Button } from './Button';
import { Card } from './Card';

interface TurnManagementPanelProps {
  isMultiplayer: boolean;
  currentPlayerId?: string;
  onAdvanceTurn?: () => void;
  onStartGame?: () => void;
  showControls?: boolean;
}

const TurnManagementPanel: React.FC<TurnManagementPanelProps> = ({
  isMultiplayer,
  currentPlayerId,
  onAdvanceTurn,
  onStartGame,
  showControls = true,
}) => {
  const {
    isGameActive,
    players,
    turnOrder,
    currentPlayerId: currentPlayerIdState,
    turnNumber,
    roundNumber,
    currentWind,
    turnDuration,
    canAdvanceTurn,
  } = useGameStore((state) => ({
    isGameActive: state.isGameActive,
    players: state.players,
    turnOrder: state.turnOrder,
    currentPlayerId: state.currentPlayerId,
    turnNumber: state.turnNumber,
    roundNumber: state.roundNumber,
    currentWind: state.currentWind,
    turnDuration: state.turnDuration,
    canAdvanceTurn: state.canAdvanceTurn,
  }));
  const gameActions = useGameStore((s) => s.actions);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Recreate selectors from old useTurnSelectors hook
  const nextPlayerId = React.useMemo(() => {
    if (!currentPlayerIdState || turnOrder.length === 0) return null;
    const currentIndex = turnOrder.indexOf(currentPlayerIdState);
    if (currentIndex === -1) return null;
    return turnOrder[(currentIndex + 1) % turnOrder.length] || null;
  }, [currentPlayerIdState, turnOrder]);

  const turnSelectors = {
    isGameActive,
    currentPlayerName: players.find((p) => p.id === currentPlayerIdState)?.name || 'No player',
    nextPlayerName: players.find((p) => p.id === nextPlayerId)?.name || 'No player',
    turnNumber,
    roundNumber,
    currentWind,
    turnDuration,
    canAdvanceTurn,
    playerCount: players.length,
    turnOrderDisplay: players.map((player) => {
      const isCurrent = player.id === currentPlayerIdState;
      const isNext = player.id === nextPlayerId;
      return { player, isCurrent, isNext };
    }),
    isMyTurn: (id: string) => currentPlayerIdState === id,
  };

  React.useEffect(() => {
    const interval = setInterval(() => {
      gameActions.updateTurnDuration();
    }, 1000);

    return () => clearInterval(interval);
  }, [gameActions]);

  const handleAdvanceTurn = () => {
    if (isMultiplayer) {
      gameActions.advanceTurn();
    } else {
      onAdvanceTurn?.();
    }
  };

  const getPlayerIndicator = (player: Player, isCurrent: boolean, isNext: boolean) => {
    let className = 'flex items-center justify-between p-3 rounded-lg border transition-all';

    if (isCurrent) {
      className += ' border-green-500 bg-green-50 shadow-md';
    } else if (isNext) {
      className += ' border-yellow-500 bg-yellow-50';
    } else {
      className += ' border-gray-200 bg-gray-50';
    }

    return (
      <div key={player.id} className={className}>
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            isCurrent ? 'bg-green-500' : isNext ? 'bg-yellow-500' : 'bg-gray-300'
          }`} />
          <span className="font-medium">{player.name}</span>
          <span className="text-sm text-gray-500 capitalize">{player.position}</span>
        </div>
        <div className="flex items-center space-x-2">
          {isCurrent && (
            <span className="px-2 py-1 text-xs bg-green-600 text-white rounded">
              Active
            </span>
          )}
          {isNext && (
            <span className="px-2 py-1 text-xs bg-yellow-600 text-white rounded">
              Next
            </span>
          )}
          {player.isReady && (
            <span className="w-2 h-2 bg-blue-500 rounded-full" title="Ready" />
          )}
        </div>
      </div>
    );
  };

  if (!turnSelectors.isGameActive && !turnSelectors.playerCount) {
    return (
      <Card className="p-4">
        <p className="text-gray-500 text-center">Turn management not initialized</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Turn Management</h3>
        {isMultiplayer && (
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
            Multiplayer
          </span>
        )}
      </div>

      {/* Game Status */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-gray-600">Current Turn</div>
          <div className="font-semibold">{turnSelectors.turnNumber}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-gray-600">Round</div>
          <div className="font-semibold">{turnSelectors.roundNumber}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-gray-600">Wind</div>
          <div className="font-semibold capitalize">{turnSelectors.currentWind}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-gray-600">Turn Time</div>
          <div className="font-semibold">{formatDuration(turnSelectors.turnDuration)}</div>
        </div>
      </div>

      {/* Current Player Display */}
      {turnSelectors.isGameActive && (
        <div className="border-t pt-4">
          <div className="text-sm text-gray-600 mb-2">Current Player</div>
          <div className="text-lg font-semibold text-center p-3 bg-green-50 border border-green-200 rounded-lg">
            {turnSelectors.currentPlayerName}
            {currentPlayerId && turnSelectors.isMyTurn(currentPlayerId) && (
              <span className="ml-2 text-sm text-green-600">(Your Turn)</span>
            )}
          </div>
        </div>
      )}

      {/* Player Order Display */}
      {turnSelectors.playerCount > 0 && (
        <div className="border-t pt-4">
          <div className="text-sm text-gray-600 mb-3">Turn Order</div>
          <div className="space-y-2">
            {turnSelectors.turnOrderDisplay.map(({ player, isCurrent, isNext }) =>
              getPlayerIndicator(player, isCurrent, isNext)
            )}
          </div>
        </div>
      )}

      {/* Turn Controls */}
      {showControls && (
        <div className="border-t pt-4 space-y-2">
          {!turnSelectors.isGameActive ? (
            <Button
              onClick={onStartGame}
              variant="primary"
              className="w-full"
              disabled={turnSelectors.playerCount === 0}
            >
              Start Game
            </Button>
          ) : (
            <Button
              onClick={handleAdvanceTurn}
              variant="primary"
              className="w-full"
              disabled={!turnSelectors.canAdvanceTurn || (currentPlayerId ? !turnSelectors.isMyTurn(currentPlayerId) : false)}
            >
              {currentPlayerId && turnSelectors.isMyTurn(currentPlayerId)
                ? 'End My Turn'
                : `Advance to ${turnSelectors.nextPlayerName}`
              }
            </Button>
          )}

          {turnSelectors.isGameActive && (
            <div className="text-xs text-gray-500 text-center">
              {currentPlayerId && !turnSelectors.isMyTurn(currentPlayerId)
                ? `Waiting for ${turnSelectors.currentPlayerName}`
                : 'Make your move then advance turn'
              }
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default TurnManagementPanel;
