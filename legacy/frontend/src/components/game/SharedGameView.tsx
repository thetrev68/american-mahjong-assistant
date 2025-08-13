// frontend/src/components/game/SharedGameView.tsx
import React from 'react';
import type { GameRoom, Player, PlayerAction, ActionType } from '../../types';
import GameTable from './GameTable';
import DiscardPile from './DiscardPile';
import TurnTimer from './TurnTimer';
import ActionButtons from './ActionButtons';

interface SharedGameViewProps {
  gameRoom: GameRoom;
  currentPlayer: Player;
  onPlayerAction: (action: PlayerAction) => void;
}

const SharedGameView: React.FC<SharedGameViewProps> = ({
  gameRoom,
  currentPlayer,
  onPlayerAction
}) => {
  const isCurrentPlayerTurn = gameRoom.currentTurn === currentPlayer.position;
  const timeRemaining = Math.max(0, 
    gameRoom.turnTimeLimit - ((Date.now() - gameRoom.turnStartTime) / 1000)
  );

  // Get recent discards (last 10)
  const recentDiscards = gameRoom.discardPile.slice(-10);
  const latestDiscard = recentDiscards[recentDiscards.length - 1];

  // Available actions based on game state
  const getAvailableActions = (): ActionType[] => {
    const actions: ActionType[] = [];
    
    if (isCurrentPlayerTurn) {
      actions.push('discard');
    } else if (latestDiscard && latestDiscard.canBeCalled) {
      // Can call the latest discard if it's from another player
      if (latestDiscard.discardedBy !== currentPlayer.position) {
        actions.push('call_pung', 'call_kong', 'call_exposure', 'pass');
      }
    }
    
    return actions;
  };

  const availableActions = getAvailableActions();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Game Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                🀄 American Mahjong
              </h1>
              <p className="text-sm text-gray-600">
                Room: <span className="font-mono">{gameRoom.id}</span>
              </p>
            </div>
            
            {/* Turn Timer */}
            <TurnTimer
              timeRemaining={timeRemaining}
              totalTime={gameRoom.turnTimeLimit}
              isActive={isCurrentPlayerTurn}
              currentTurn={gameRoom.currentTurn}
            />
          </div>
        </div>

        {/* Main Game Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Game Table - Takes up 2 columns on large screens */}
          <div className="lg:col-span-2">
            <GameTable
              players={gameRoom.players}
              currentTurn={gameRoom.currentTurn}
              currentPlayerId={currentPlayer.id}
            />
          </div>

          {/* Side Panel - Discards and Actions */}
          <div className="space-y-4">
            {/* Discard Pile */}
            <DiscardPile
              discards={recentDiscards}
              onTileCall={(tile, callType) => {
                const action: PlayerAction = {
                  playerId: currentPlayer.id,
                  type: callType,
                  timestamp: Date.now(),
                  tile: tile,
                  targetPlayerId: latestDiscard?.discardedBy
                };
                onPlayerAction(action);
              }}
              canCall={!isCurrentPlayerTurn && latestDiscard?.canBeCalled}
            />

            {/* Action Buttons */}
            <ActionButtons
              availableActions={availableActions}
              onAction={(actionType, data) => {
                const action: PlayerAction = {
                  playerId: currentPlayer.id,
                  type: actionType,
                  timestamp: Date.now(),
                  ...data
                };
                onPlayerAction(action);
              }}
              isCurrentTurn={isCurrentPlayerTurn}
              context={isCurrentPlayerTurn ? 'discard' : 'call'}
            />

            {/* Game Status */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Game Status</h3>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Phase: <span className="font-medium capitalize">{gameRoom.phase}</span></div>
                <div>Tiles Remaining: <span className="font-medium">{gameRoom.wall.tilesRemaining}</span></div>
                <div>Total Discarded: <span className="font-medium">{gameRoom.wall.totalDiscarded}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Turn Indicator Banner */}
        {!isCurrentPlayerTurn && (
          <div className="fixed bottom-4 left-4 right-4 bg-blue-600 text-white rounded-lg p-3 shadow-lg lg:relative lg:bottom-auto lg:left-auto lg:right-auto lg:mt-4">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="font-medium">
                Waiting for {gameRoom.players.find(p => p.position === gameRoom.currentTurn)?.name}'s turn
              </span>
            </div>
          </div>
        )}

        {/* Your Turn Banner */}
        {isCurrentPlayerTurn && (
          <div className="fixed bottom-4 left-4 right-4 bg-green-600 text-white rounded-lg p-3 shadow-lg lg:relative lg:bottom-auto lg:left-auto lg:right-auto lg:mt-4">
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg">⏰</span>
              <span className="font-medium">Your turn! Choose an action.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedGameView;