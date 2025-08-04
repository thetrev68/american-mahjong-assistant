// frontend/src/components/game/MyTileCounter.tsx
// Component for player's tile count input during tile-input phase

import React from 'react';

interface MyTileCounterProps {
  myTileCount: number;
  onTileCountChange: (count: number) => void;
}

const MyTileCounter: React.FC<MyTileCounterProps> = ({
  myTileCount,
  onTileCountChange
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Your Tiles</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of tiles in your hand:
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="number"
              min="0"
              max="14"
              value={myTileCount}
              onChange={(e) => onTileCountChange(parseInt(e.target.value) || 0)}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-medium"
            />
            <span className="text-sm text-gray-600">
              {myTileCount === 13 ? '✅ Ready!' : myTileCount > 13 ? '❌ Too many' : '⏳ Need 13 tiles'}
            </span>
          </div>
        </div>
        
        <div className="text-xs text-gray-500">
          Count all tiles in your hand including jokers and flowers
        </div>
      </div>
    </div>
  );
};

export default MyTileCounter;