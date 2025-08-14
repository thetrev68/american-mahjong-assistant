// DEBUG: Badge Positioning Test Component
// This will help us understand the exact DOM structure

import React from 'react'
import { TileSprite } from './ui-components/TileSprite'
import { Tile } from './ui-components/Tile'
import { tileService } from './services/tile-service'

export const BadgePositionTest = () => {
  const createDummyPlayerTile = (id: string) => ({
    ...tileService.getTileById(id),
    instanceId: `debug_${id}`,
    isSelected: false
  })

  return (
    <div style={{ padding: '50px', background: '#f0f0f0' }}>
      <h3>Badge Position Debug</h3>
      
      {/* Test 1: Direct TileSprite with absolute positioning */}
      <div style={{ margin: '20px', position: 'relative', display: 'inline-block' }}>
        <h4>Test 1: Direct on TileSprite container</h4>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <TileSprite tileId="1D" size="md" interactive={false} />
          <div style={{
            position: 'absolute',
            top: '0px',
            right: '0px',
            width: '20px',
            height: '20px',
            backgroundColor: 'red',
            borderRadius: '50%',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            zIndex: 1000,
            transform: 'translate(50%, -50%)'
          }}>
            1
          </div>
        </div>
      </div>

      {/* Test 2: Calculate exact pixel position */}
      <div style={{ margin: '20px', position: 'relative', display: 'inline-block' }}>
        <h4>Test 2: Exact pixel calculation</h4>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <TileSprite tileId="2D" size="md" interactive={false} />
          <div style={{
            position: 'absolute',
            top: '-10px',  // Half badge height above
            right: '-10px', // Half badge width outside
            width: '20px',
            height: '20px',
            backgroundColor: 'blue',
            borderRadius: '50%',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            zIndex: 1000
          }}>
            2
          </div>
        </div>
      </div>

      {/* Test 3: Using the tile's known dimensions */}
      <div style={{ margin: '20px', position: 'relative', display: 'inline-block' }}>
        <h4>Test 3: Using 52x69 dimensions</h4>
        <div style={{ 
          position: 'relative', 
          display: 'inline-block',
          width: '52px',
          height: '69px'
        }}>
          <TileSprite tileId="3D" size="md" interactive={false} />
          <div style={{
            position: 'absolute',
            top: '-8px',    // 8px above tile
            right: '-8px',  // 8px right of tile 
            width: '16px',
            height: '16px',
            backgroundColor: 'green',
            borderRadius: '50%',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            zIndex: 1000,
            border: '1px solid white'
          }}>
            3
          </div>
        </div>
      </div>

      {/* Test 4: EXACT TileSelector Structure - This should show the problem! */}
      <div style={{ margin: '20px', position: 'relative', display: 'inline-block' }}>
        <h4>Test 4: EXACT TileSelector Structure (Tile wrapper)</h4>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Tile
            tile={createDummyPlayerTile('4D')}
            size="md"
            interactive={false}
          />
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            width: '20px',
            height: '20px',
            backgroundColor: 'orange',
            borderRadius: '50%',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 1000,
            border: '1px solid white'
          }}>
            4
          </div>
        </div>
      </div>

      {/* Test 5: Using Tile children prop */}
      <div style={{ margin: '20px', position: 'relative', display: 'inline-block' }}>
        <h4>Test 5: Using Tile children overlay</h4>
        <Tile
          tile={createDummyPlayerTile('5D')}
          size="md"
          interactive={false}
        >
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            width: '20px',
            height: '20px',
            backgroundColor: 'purple',
            borderRadius: '50%',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 1000,
            border: '1px solid white'
          }}>
            5
          </div>
        </Tile>
      </div>

      {/* Test 6: CSS Grid with gap (like TileSelector) */}
      <div style={{ margin: '20px' }}>
        <h4>Test 6: CSS Grid with gap-4 (TileSelector context)</h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '16px' // gap-4 in Tailwind
        }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <Tile
              tile={createDummyPlayerTile('6D')}
              size="md"
              interactive={false}
            />
            <div style={{
              position: 'absolute',
              top: '-10px',
              right: '-10px',
              width: '20px',
              height: '20px',
              backgroundColor: 'pink',
              borderRadius: '50%',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              zIndex: 1000,
              border: '1px solid white'
            }}>
              6
            </div>
          </div>
        </div>
      </div>

      {/* Test 7: With transform classes (like TileSelector hover) */}
      <div style={{ margin: '20px' }}>
        <h4>Test 7: With transform classes (TileSelector styling)</h4>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Tile
            tile={createDummyPlayerTile('7D')}
            size="md"
            interactive={false}
            className="hover:scale-110 transition-transform duration-200"
          />
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            width: '20px',
            height: '20px',
            backgroundColor: 'cyan',
            borderRadius: '50%',
            color: 'black',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 1000,
            border: '1px solid white'
          }}>
            7
          </div>
        </div>
      </div>

      {/* Test 8: Compact view with overflow-y-auto (SMOKING GUN?) */}
      <div style={{ margin: '20px' }}>
        <h4>Test 8: Compact grid with overflow-y-auto</h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(6, 1fr)', 
          gap: '8px',
          maxHeight: '128px',
          overflowY: 'auto'
        }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <Tile
              tile={createDummyPlayerTile('8D')}
              size="sm"
              interactive={false}
            />
            <div style={{
              position: 'absolute',
              top: '-10px',
              right: '-10px',
              width: '20px',
              height: '20px',
              backgroundColor: 'red',
              borderRadius: '50%',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              zIndex: 1000,
              border: '1px solid white'
            }}>
              8
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}