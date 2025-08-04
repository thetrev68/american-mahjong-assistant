// frontend/src/components/game/GameProgress.tsx
// Component for showing progress status during tile-input phase

import React from 'react';
import type { Player } from '../../types';

interface GameProgressProps {
  players: Player[];
  participatingPlayers: string[];
  allPlayersReady: boolean;
}

const GameProgress: React.FC<GameProgressProps> = ({
  players,
  participatingPlayers,
  allPlayersReady
}) => {
  const readyCount = players.filter(p => participatingPlayers.includes(p.id) && p.isReady).length;
  const totalParticipating = participatingPlayers.length;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h3 className="text-md font-medium text-gray-900 mb-3">Progress</h3>
      {allPlayersReady ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-green-600">🎉</span>
            <div className="text-sm text-green-800">
              <div className="font-medium">All players ready!</div>
              <div>Automatically advancing to Charleston phase...</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600">⏳</span>
            <div className="text-sm text-yellow-800">
              <div className="font-medium">Waiting for players to count tiles</div>
              <div>
                {readyCount} / {totalParticipating} players ready
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameProgress;