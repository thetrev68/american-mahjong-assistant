// frontend/src/components/PrivateHandView/PrivateHandView.tsx
// FIXED: State synchronization to prevent freezing

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { 
  Tile, 
  PlayerAction,
  ActionType 
} from '../../types';
import { HandTileGrid } from './HandTileGrid';
import { HandAnalysisPanel } from './HandAnalysisPanel';
import { TileActionBar } from './TileActionBar';
import { usePrivateGameState } from './hooks/usePrivateGameState';
import { useHandAnalysis } from './hooks/useHandAnalysis';
// Remove unused import

interface PrivateHandViewProps {
  playerId: string;
  gamePhase: 'waiting' | 'charleston' | 'playing' | 'finished';
  charlestonPhase?: 'right' | 'across' | 'left' | 'optional' | 'complete';
  isMyTurn: boolean;
  onPlayerAction: (action: PlayerAction) => void;
  onTilesUpdate: (tiles: Tile[]) => void;
  serverTiles?: Tile[]; // Optional server tiles to initialize with
}

type HandMode = 'view' | 'discard' | 'charleston' | 'input';

export const PrivateHandView: React.FC<PrivateHandViewProps> = ({
  playerId,
  gamePhase,
  charlestonPhase,
  isMyTurn,
  onPlayerAction,
  onTilesUpdate,
  serverTiles
}) => {
  // State management
  const [handMode, setHandMode] = useState<HandMode>('view');
  const [selectedTiles, setSelectedTiles] = useState<Tile[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  // FIXED: Add ref to prevent update loops
  const updateInProgressRef = useRef(false);
  
  // FIXED: Custom hooks for game state and analysis
  const { privateState, updateTiles: updatePrivateStateTiles, isLoading } = usePrivateGameState(playerId, serverTiles);
  const { analysis, isAnalyzing } = useHandAnalysis(privateState?.tiles || []);
  
  // 🎲 CHEAT CODE: Generate random tiles for testing
  const generateRandomTiles = useCallback((count: number) => {
    const allTiles: Tile[] = [];
    
    // Create American Mahjong tile set
    const suits: ('dots' | 'bams' | 'cracks')[] = ['dots', 'bams', 'cracks'];
    const values: ('1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9')[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const winds: ('east' | 'south' | 'west' | 'north')[] = ['east', 'south', 'west', 'north'];
    const dragons: ('red' | 'green' | 'white')[] = ['red', 'green', 'white'];
    
    // Add 4 of each suit tile (1-9 dots, bams, cracks)
    suits.forEach(suit => {
      values.forEach(value => {
        for (let i = 0; i < 4; i++) {
          allTiles.push({
            id: `${suit}-${value}-${i}`,
            suit: suit,
            value: value
          });
        }
      });
    });
    
    // Add 4 of each wind tile
    winds.forEach(wind => {
      for (let i = 0; i < 4; i++) {
        allTiles.push({
          id: `winds-${wind}-${i}`,
          suit: 'winds',
          value: wind
        });
      }
    });
    
    // Add 4 of each dragon tile
    dragons.forEach(dragon => {
      for (let i = 0; i < 4; i++) {
        allTiles.push({
          id: `dragons-${dragon}-${i}`,
          suit: 'dragons',
          value: dragon
        });
      }
    });
    
    // Add 8 jokers
    for (let i = 0; i < 8; i++) {
      allTiles.push({
        id: `joker-${i}`,
        suit: 'jokers',
        value: 'joker'
      });
    }
    
    // Shuffle and pick random tiles
    const shuffled = allTiles.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }, []);
  
  // 🎲 CHEAT CODE: Keyboard shortcut listener
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl+Shift+T = Generate 13 tiles
      // Ctrl+Shift+D = Generate 14 tiles (dealer)
      if (event.ctrlKey && event.shiftKey) {
        if (event.key === 'T') {
          event.preventDefault();
          const newTiles = generateRandomTiles(13);
          updatePrivateStateTiles(newTiles);
          onTilesUpdate(newTiles);
          
          // Visual feedback
          const originalTitle = document.title;
          document.title = '🎲 13 TILES GENERATED! 🎲';
          setTimeout(() => document.title = originalTitle, 2000);
        } else if (event.key === 'D') {
          event.preventDefault();
          const newTiles = generateRandomTiles(14);
          updatePrivateStateTiles(newTiles);
          onTilesUpdate(newTiles);
          
          // Visual feedback
          const originalTitle = document.title;
          document.title = '🎲 14 DEALER TILES GENERATED! 🎲';
          setTimeout(() => document.title = originalTitle, 2000);
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [generateRandomTiles, updatePrivateStateTiles, onTilesUpdate]);
  
  console.log('PrivateHandView: Current state', { 
    playerId, 
    gamePhase, 
    tiles: privateState?.tiles?.length || 0,
    updateInProgress: updateInProgressRef.current
  });
  
  // Auto-switch to appropriate mode based on game phase
  useEffect(() => {
    if (gamePhase === 'waiting') {
      // During waiting/tile-input phase, enable input mode
      setHandMode('input');
      setSelectedTiles([]);
    } else if (gamePhase === 'charleston' && charlestonPhase !== 'complete') {
      setHandMode('charleston');
      setSelectedTiles([]);
    } else if (gamePhase === 'playing') {
      setHandMode('view');
      setSelectedTiles([]);
    } else {
      setHandMode('view');
      setSelectedTiles([]);
    }
  }, [gamePhase, charlestonPhase]);

  // Get max selection based on current mode
  const getMaxSelection = (): number => {
    switch (handMode) {
      case 'discard': return 1;
      case 'charleston': return 3;
      case 'input': return 0; // No selection limit in input mode
      default: return 0;
    }
  };

  // Handle action confirmations
  const handleConfirmAction = () => {
    if (selectedTiles.length === 0) return;

    const action: PlayerAction = {
      playerId,
      type: getActionType(),
      timestamp: Date.now(),
      tiles: selectedTiles
    };

    onPlayerAction(action);
    setSelectedTiles([]);
    setHandMode('view');
  };

  const getActionType = (): ActionType => {
    switch (handMode) {
      case 'discard': return 'discard';
      case 'charleston': return 'charleston_pass';
      default: return 'pass';
    }
  };

  // FIXED: Prevent recursive updates and state conflicts
  const handleTilesChange = useCallback((newTiles: Tile[]) => {
    // Prevent recursive updates
    if (updateInProgressRef.current) {
      console.log('PrivateHandView: Update already in progress, skipping');
      return;
    }

    // Check if tiles actually changed
    const currentTiles = privateState?.tiles || [];
    if (currentTiles.length === newTiles.length && 
        currentTiles.every((tile, index) => tile.id === newTiles[index]?.id)) {
      console.log('PrivateHandView: No tile changes detected, skipping update');
      return;
    }

    console.log('PrivateHandView: Processing tile change', { 
      oldCount: currentTiles.length,
      newCount: newTiles.length,
      playerId
    });
    
    updateInProgressRef.current = true;
    
    try {
      // Update local state first
      updatePrivateStateTiles(newTiles);
      
      // Then notify parent - use setTimeout to break the synchronous call chain
      setTimeout(() => {
        onTilesUpdate(newTiles);
        updateInProgressRef.current = false;
      }, 0);
    } catch (error) {
      console.error('PrivateHandView: Error updating tiles', error);
      updateInProgressRef.current = false;
    }
  }, [privateState?.tiles, updatePrivateStateTiles, onTilesUpdate, playerId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading your tiles...</p>
        </div>
      </div>
    );
  }

  if (!privateState) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-gray-600">Unable to load private game state</p>
        </div>
      </div>
    );
  }

  const canSelectTiles = handMode !== 'view' && handMode !== 'input' && (
    (handMode === 'discard' && isMyTurn) ||
    (handMode === 'charleston' && gamePhase === 'charleston')
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header with title and controls */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900">Your Hand</h2>
            <span className="text-sm text-gray-500">
              {privateState.tiles.length} tiles
            </span>
            {/* ADDED: Debug indicator */}
            {updateInProgressRef.current && (
              <span className="text-xs text-orange-500 bg-orange-100 px-2 py-1 rounded">
                Updating...
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Analysis toggle - hide during input phase */}
            {handMode !== 'input' && privateState.tiles.length >= 13 && (
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  showAnalysis
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {showAnalysis ? 'Hide' : 'Show'} Analysis
              </button>
            )}

            {/* Mode indicator */}
            {handMode !== 'view' && (
              <div className={`px-2 py-1 text-xs font-medium rounded ${
                handMode === 'input' ? 'bg-green-100 text-green-800' :
                handMode === 'charleston' ? 'bg-yellow-100 text-yellow-800' :
                handMode === 'discard' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-600'
              }`}>
                {handMode === 'input' ? 'Input Mode' :
                 handMode === 'charleston' ? 'Charleston' : 
                 handMode === 'discard' ? 'Discard' : 
                 'View'} Mode
              </div>
            )}
          </div>
        </div>

        {/* Selection status - only show for charleston/discard modes */}
        {canSelectTiles && (
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Select {getMaxSelection()} tile{getMaxSelection() > 1 ? 's' : ''} 
              {handMode === 'charleston' ? ' to pass' : ' to discard'}
            </p>
            <span className="text-sm font-medium text-blue-600">
              {selectedTiles.length} / {getMaxSelection()} selected
            </span>
          </div>
        )}

        {/* Input mode instructions */}
        {handMode === 'input' && (
          <div className="mt-2 text-sm text-gray-600">
            Tap any slot to add/change tiles. Progress: {privateState.tiles.length}/13
            {privateState.tiles.length === 10 && (
              <span className="ml-2 text-orange-600 font-medium">
                (3 more needed)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="p-4 pb-20"> {/* Add bottom padding to prevent button overlap */}
        {/* Hand analysis panel (collapsible) - hide during input phase */}
        {showAnalysis && handMode !== 'input' && privateState.tiles.length >= 13 && (
          <div className="mb-4">
            <HandAnalysisPanel 
              analysis={analysis}
              isLoading={isAnalyzing}
              selectedTiles={selectedTiles}
            />
          </div>
        )}

        {/* Tile grid - using proper private state */}
        <div className="mb-4">
          <HandTileGrid
            tiles={privateState.tiles}
            onTilesChange={handleTilesChange}
            recommendations={handMode !== 'input' ? analysis?.recommendations : undefined}
            readOnly={updateInProgressRef.current} // FIXED: Prevent interaction during updates
          />
        </div>

        {/* Action bar - positioned at bottom to avoid overlap */}
        {handMode !== 'view' && handMode !== 'input' && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-10">
            <TileActionBar
              gamePhase={gamePhase}
              charlestonPhase={charlestonPhase}
              isMyTurn={isMyTurn}
              handMode={handMode}
              selectedTiles={selectedTiles}
              maxSelection={getMaxSelection()}
              onModeChange={setHandMode}
              onConfirmAction={handleConfirmAction}
              onCancel={() => {
                setSelectedTiles([]);
                setHandMode('view');
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};