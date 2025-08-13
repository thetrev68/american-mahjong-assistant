// frontend/src/components/game/ExposedSets.tsx
import React from 'react';
import type { ExposedSet, PlayerPosition } from '../../types';
import TileComponent from '../tiles/TileComponent';

interface ExposedSetsProps {
  exposedSets: ExposedSet[];
  playerPosition: PlayerPosition;
  layout?: 'horizontal' | 'vertical';
}

const ExposedSets: React.FC<ExposedSetsProps> = ({
  exposedSets,
  playerPosition,
  layout = 'horizontal'
}) => {
  if (exposedSets.length === 0) {
    return null;
  }

  // Position labels for "called from" display
  const positionLabels = {
    east: 'E',
    south: 'S',
    west: 'W', 
    north: 'N'
  };

  // Set type display names
  const setTypeLabels = {
    pung: 'Pung',
    kong: 'Kong',
    exposure: 'Exposure',
    pair: 'Pair'
  };

  // Set type colors
  const setTypeColors = {
    pung: 'bg-red-100 text-red-800 border-red-300',
    kong: 'bg-purple-100 text-purple-800 border-purple-300',
    exposure: 'bg-blue-100 text-blue-800 border-blue-300',
    pair: 'bg-green-100 text-green-800 border-green-300'
  };

  return (
    <div className={`
      ${layout === 'vertical' ? 'space-y-2' : 'flex flex-wrap gap-2'}
      max-w-xs
    `}>
      {exposedSets.map((set, setIndex) => (
        <div
          key={`${playerPosition}-set-${setIndex}`}
          className={`
            border-2 rounded-lg p-2 bg-white shadow-sm
            ${setTypeColors[set.type]}
          `}
        >
          {/* Set header */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium">
              {setTypeLabels[set.type]}
            </span>
            {set.calledFrom && (
              <span className="text-xs opacity-75">
                from {positionLabels[set.calledFrom]}
              </span>
            )}
          </div>

          {/* Tiles in the set */}
          <div className={`
            flex gap-1
            ${layout === 'vertical' ? 'justify-center' : ''}
          `}>
            {set.tiles.map((tile, tileIndex) => (
              <TileComponent
                key={`${set.timestamp}-tile-${tileIndex}`}
                tile={tile}
                size="small"
                isDisabled={true}
              />
            ))}
          </div>

          {/* Set timestamp */}
          <div className="text-xs opacity-50 mt-1 text-center">
            {new Date(set.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExposedSets;