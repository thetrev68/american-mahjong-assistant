// frontend/src/components/tiles/SpriteDebugger.tsx
// Temporary debug component to test sprite loading

import React, { useState, useEffect } from 'react';

const SpriteDebugger: React.FC = () => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      console.log('Sprite sheet loaded:', {
        width: img.naturalWidth,
        height: img.naturalHeight,
        src: img.src
      });
    };
    img.onerror = () => {
      setImageError(true);
      console.error('Failed to load sprite sheet from /tiles.png');
    };
    img.src = '/tiles.png';
  }, []);

  // Test a few tile sprites
  const testTiles = [
    { id: '1D', x: 104, y: 0 },
    { id: '2B', x: 156, y: 0 },
    { id: 'east', x: 1560, y: 0 },
    { id: 'red', x: 1508, y: 0 },
    { id: 'joker', x: 1820, y: 0 }
  ];

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="font-bold text-yellow-800 mb-4">🔧 Sprite Debug Info</h3>
      
      {/* Image loading status */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            imageLoaded ? 'bg-green-500' : imageError ? 'bg-red-500' : 'bg-yellow-500'
          }`} />
          <span className="text-sm">
            {imageLoaded ? 'Sprite sheet loaded successfully' :
             imageError ? 'Failed to load sprite sheet' :
             'Loading sprite sheet...'}
          </span>
        </div>
        
        {imageLoaded && (
          <div className="text-xs text-gray-600">
            Dimensions: {imageDimensions.width} × {imageDimensions.height}px
            {imageDimensions.width !== 2028 && (
              <span className="text-red-600 ml-2">
                ⚠️ Expected 2028px width, got {imageDimensions.width}px
              </span>
            )}
          </div>
        )}
      </div>

      {/* Test tile sprites */}
      {imageLoaded && (
        <div>
          <h4 className="text-sm font-medium mb-2">Test Tile Sprites:</h4>
          <div className="flex gap-2 mb-4">
            {testTiles.map(tile => (
              <div key={tile.id} className="text-center">
                <div 
                  className="w-12 h-16 border border-gray-300 rounded bg-white"
                  style={{
                    backgroundImage: `url('/tiles.png')`,
                    backgroundPosition: `-${tile.x}px -${tile.y}px`,
                    backgroundSize: '2028px 69px',
                    backgroundRepeat: 'no-repeat'
                  }}
                />
                <div className="text-xs mt-1">{tile.id}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-gray-600 bg-white p-2 rounded">
        <strong>To fix sprite issues:</strong><br/>
        1. Make sure <code>tiles.png</code> is in <code>/frontend/public/tiles.png</code><br/>
        2. Verify the sprite sheet is 2028×69 pixels<br/>
        3. Check browser Network tab for 404 errors<br/>
        4. Clear browser cache and refresh
      </div>
    </div>
  );
};

export default SpriteDebugger;