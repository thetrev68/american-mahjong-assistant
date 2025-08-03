// frontend/src/components/PrivateHandView/PrivateHandView.tsx
// Main private player interface - shows personal tiles, analysis, and selection controls

import React, { useState, useEffect } from 'react';
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

interface PrivateHandViewProps {
  playerId: string;
  gamePhase: 'waiting' | 'charleston' | 'playing' | 'finished';
  charlestonPhase?: 'right' | 'across' | 'left' | 'optional' | 'complete';
  isMyTurn: boolean;
  onPlayerAction: (action: PlayerAction) => void;
  onTilesUpdate: (tiles: Tile[]) => void;
}

type HandMode = 'view' | 'discard' | 'charleston';

export const PrivateHandView: React.FC<PrivateHandViewProps> = ({
  playerId,
  gamePhase,
  charlestonPhase,
  isMyTurn,
  onPlayerAction,
  onTilesUpdate
}) => {
  // State management
  const [handMode, setHandMode] = useState<HandMode>('view');
  const [selectedTiles, setSelectedTiles] = useState<Tile[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  // Custom hooks for game state and analysis
  const { privateState } = usePrivateGameState(playerId);
  const { analysis, isAnalyzing } = useHandAnalysis(privateState?.tiles || []);
  
  // Auto-switch to charleston mode when charleston phase starts
  useEffect(() => {
    if (gamePhase === 'charleston' && charlestonPhase !== 'complete') {
      setHandMode('charleston');
      setSelectedTiles([]);
    } else if (gamePhase === 'playing') {
      setHandMode('view');
      setSelectedTiles([]);
    }
  }, [gamePhase, charlestonPhase]);

  // Handle tile selection based on current mode
  const handleTileSelect = (tile: Tile) => {
    if (!privateState?.tiles) return;

    const isSelected = selectedTiles.some(t => t.id === tile.id);
    const maxSelection = getMaxSelection();

    if (isSelected) {
      // Deselect tile
      setSelectedTiles(prev => prev.filter(t => t.id !== tile.id));
    } else if (selectedTiles.length < maxSelection) {
      // Select tile
      setSelectedTiles(prev => [...prev, tile]);
    }
  };

  // Get max selection based on current mode
  const getMaxSelection = (): number => {
    switch (handMode) {
      case 'discard': return 1;
      case 'charleston': return 3;
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

  // Handle manual tile updates (for input mode)
  const handleTilesChange = (newTiles: Tile[]) => {
    onTilesUpdate(newTiles);
  };

  if (!privateState) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading your tiles...</p>
        </div>
      </div>
    );
  }

  const canSelectTiles = handMode !== 'view' && (
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
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Analysis toggle */}
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

            {/* Mode indicator */}
            {handMode !== 'view' && (
              <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                {handMode === 'charleston' ? 'Charleston' : 'Discard'} Mode
              </div>
            )}
          </div>
        </div>

        {/* Selection status */}
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
      </div>

      {/* Main content */}
      <div className="p-4">
        {/* Hand analysis panel (collapsible) */}
        {showAnalysis && (
          <div className="mb-4">
            <HandAnalysisPanel 
              analysis={analysis}
              isLoading={isAnalyzing}
              selectedTiles={selectedTiles}
            />
          </div>
        )}

        {/* Tile grid */}
        <div className="mb-4">
          <HandTileGrid
            tiles={privateState.tiles}
            selectedTiles={selectedTiles}
            onTileSelect={canSelectTiles ? handleTileSelect : undefined}
            onTilesChange={handleTilesChange}
            recommendations={analysis?.recommendations}
            readOnly={!canSelectTiles}
          />
        </div>

        {/* Action bar */}
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
    </div>
  );
};