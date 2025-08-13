// frontend/src/components/game/MyTileCounter.tsx
// Component for player's tile count input during tile-input phase

import React, { useState, useRef } from 'react';

interface MyTileCounterProps {
  myTileCount: number;
  onTileCountChange: (count: number) => void;
  expectedTileCount?: number; // 13 for most players, 14 for dealer/East
}

const MyTileCounter: React.FC<MyTileCounterProps> = ({
  myTileCount,
  onTileCountChange,
  expectedTileCount = 13
}) => {
  // Cheat code state for testing
  const [clickCount, setClickCount] = useState(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Easter egg: Triple-click the title to auto-populate tile count
  const handleTitleClick = () => {
    setClickCount(prev => prev + 1);
    
    // Clear existing timer
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }
    
    // Set timer to reset click count after 1 second
    clickTimerRef.current = setTimeout(() => {
      setClickCount(0);
    }, 1000);
    
    // Triple-click detected!
    if (clickCount + 1 === 3) {
      onTileCountChange(expectedTileCount);
      setClickCount(0);
      
      // Show brief feedback
      const originalTitle = document.title;
      document.title = '🎲 TILES POPULATED! 🎲';
      setTimeout(() => {
        document.title = originalTitle;
      }, 1500);
    }
  };
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 
        className="text-lg font-medium text-gray-900 mb-4 cursor-pointer select-none" 
        onClick={handleTitleClick}
        title="Triple-click to auto-populate tiles (testing cheat)"
      >
        Your Tiles {clickCount > 0 && <span className="text-xs text-gray-400">({clickCount}/3)</span>}
      </h2>
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