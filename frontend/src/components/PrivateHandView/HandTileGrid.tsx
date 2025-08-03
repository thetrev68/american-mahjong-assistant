// frontend/src/components/PrivateHandView/HandTileGrid.tsx
// Touch-friendly grid for displaying and selecting player's tiles

import React, { useState } from 'react';
import type { Tile } from '../../types';
import { sortTiles, validateTileCollection } from '../../utils/tile-utils';
import TileComponent from '../tiles/TileComponent';

interface TileInputMode {
  isActive: boolean;
  editingIndex: number | null;
}

interface HandTileGridProps {
  tiles: Tile[];
  selectedTiles: Tile[];
  onTileSelect?: (tile: Tile) => void;
  onTilesChange: (tiles: Tile[]) => void;
  recommendations?: {
    keep: Tile[];
    discard: Tile[];
    charleston: Tile[];
  };
  readOnly?: boolean;
}

export const HandTileGrid: React.FC<HandTileGridProps> = ({
  tiles,
  selectedTiles,
  onTileSelect,
  onTilesChange,
  recommendations,
  readOnly = false
}) => {
  const [inputMode, setInputMode] = useState<TileInputMode>({
    isActive: false,
    editingIndex: null
  });
  const [inputValue, setInputValue] = useState('');

  // Sort tiles for consistent display
  const sortedTiles = sortTiles(tiles);
  
  // Get tile recommendation status
  const getTileRecommendation = (tile: Tile): 'keep' | 'discard' | 'charleston' | null => {
    if (!recommendations) return null;
    
    if (recommendations.keep.some(t => t.id === tile.id)) return 'keep';
    if (recommendations.discard.some(t => t.id === tile.id)) return 'discard';
    if (recommendations.charleston.some(t => t.id === tile.id)) return 'charleston';
    
    return null;
  };

  // Check if tile is selected
  const isTileSelected = (tile: Tile): boolean => {
    return selectedTiles.some(t => t.id === tile.id);
  };

  // Handle tile click
  const handleTileClick = (tile: Tile, index: number) => {
    if (readOnly) return;

    // If in input mode, start editing this tile
    if (inputMode.isActive) {
      setInputMode({ isActive: true, editingIndex: index });
      setInputValue(tile.id);
      return;
    }

    // Otherwise, handle selection
    if (onTileSelect) {
      onTileSelect(tile);
    }
  };

  // Handle adding new tile slot
  const handleAddTile = () => {
    if (tiles.length >= 14) return; // Max 14 tiles in hand
    
    setInputMode({ isActive: true, editingIndex: tiles.length });
    setInputValue('');
  };

  // Handle input confirmation
  const handleInputConfirm = () => {
    if (!inputValue.trim()) {
      setInputMode({ isActive: false, editingIndex: null });
      return;
    }

    // Create tile from input (simplified - you might want more validation)
    const newTile = createTileFromInput(inputValue.trim());
    if (!newTile) {
      alert('Invalid tile format. Try: 1D, 2B, 3C, east, red, joker');
      return;
    }

    const newTiles = [...tiles];
    if (inputMode.editingIndex !== null) {
      if (inputMode.editingIndex < tiles.length) {
        // Editing existing tile
        newTiles[inputMode.editingIndex] = newTile;
      } else {
        // Adding new tile
        newTiles.push(newTile);
      }
    }

    // Validate the new tile collection
    const validation = validateTileCollection(newTiles);
    if (!validation.isValid) {
      alert(`Invalid tiles: ${validation.errors.join(', ')}`);
      return;
    }

    onTilesChange(newTiles);
    setInputMode({ isActive: false, editingIndex: null });
    setInputValue('');
  };

  // Handle input cancel
  const handleInputCancel = () => {
    setInputMode({ isActive: false, editingIndex: null });
    setInputValue('');
  };

  // Create tile from string input
  const createTileFromInput = (input: string): Tile | null => {
    const normalized = input.toLowerCase().trim();
    
    // Handle joker
    if (normalized === 'joker' || normalized === 'j') {
      return { id: 'joker', suit: 'jokers', value: 'joker' };
    }

    // Handle winds
    const winds = ['east', 'south', 'west', 'north'];
    if (winds.includes(normalized)) {
      return { 
        id: normalized, 
        suit: 'winds', 
        value: normalized as 'east' | 'south' | 'west' | 'north'
      };
    }

    // Handle dragons
    const dragons = ['red', 'green', 'white'];
    if (dragons.includes(normalized)) {
      return { 
        id: normalized, 
        suit: 'dragons', 
        value: normalized as 'red' | 'green' | 'white'
      };
    }

    // Handle numbered tiles (1D, 2B, 3C format)
    const numberMatch = normalized.match(/^([1-9])([dbc])$/);
    if (numberMatch) {
      const [, num, suitChar] = numberMatch;
      const suitMap: Record<string, 'dots' | 'bams' | 'cracks'> = {
        'd': 'dots',
        'b': 'bams', 
        'c': 'cracks'
      };
      
      const suit = suitMap[suitChar];
      if (suit) {
        return {
          id: `${num}${suitChar.toUpperCase()}`,
          suit,
          value: num as '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
        };
      }
    }

    return null;
  };

  // Handle tile deletion
  const handleDeleteTile = (index: number) => {
    if (readOnly) return;
    
    const newTiles = tiles.filter((_, i) => i !== index);
    onTilesChange(newTiles);
  };

  return (
    <div className="space-y-3">
      {/* Input mode toggle */}
      {!readOnly && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setInputMode(prev => ({ ...prev, isActive: !prev.isActive }))}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              inputMode.isActive
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {inputMode.isActive ? 'Exit Edit' : 'Edit Tiles'}
          </button>
          
          {!inputMode.isActive && (
            <button
              onClick={handleAddTile}
              disabled={tiles.length >= 14}
              className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed min-h-[44px]"
            >
              + Add Tile
            </button>
          )}
        </div>
      )}

      {/* Tiles grid */}
      <div className="grid grid-cols-7 gap-2 p-3 bg-gray-50 rounded-lg min-h-[200px]">
        {sortedTiles.map((tile, index) => {
          const recommendation = getTileRecommendation(tile);
          const isSelected = isTileSelected(tile);
          
          return (
            <div key={`${tile.id}-${index}`} className="relative">
              {/* Tile component with recommendation indicator */}
              <div className="relative">
                <TileComponent
                  tile={tile}
                  isSelected={isSelected}
                  isDisabled={readOnly && !inputMode.isActive}
                  size="small"
                  onClick={() => handleTileClick(tile, index)}
                />
                
                {/* Recommendation indicator */}
                {recommendation && (
                  <div className={`absolute inset-0 rounded-md ring-2 pointer-events-none ${
                    recommendation === 'keep' ? 'ring-green-500' : ''
                  }${
                    recommendation === 'discard' ? 'ring-red-500' : ''
                  }${
                    recommendation === 'charleston' ? 'ring-yellow-500' : ''
                  }`}/>
                )}
              </div>
              
              {/* Delete button in edit mode */}
              {inputMode.isActive && (
                <button
                  onClick={() => handleDeleteTile(index)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 flex items-center justify-center"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}

        {/* Add tile slots when in input mode */}
        {inputMode.isActive && tiles.length < 14 && (
          Array.from({ length: 14 - tiles.length }, (_, i) => (
            <button
              key={`empty-${i}`}
              onClick={() => setInputMode({ isActive: true, editingIndex: tiles.length + i })}
              className="aspect-[3/4] border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400 hover:bg-gray-100 flex items-center justify-center text-gray-400 text-xs min-h-[44px]"
            >
              +
            </button>
          ))
        )}
      </div>

      {/* Input field when editing */}
      {inputMode.isActive && inputMode.editingIndex !== null && (
        <div className="p-3 bg-white border border-gray-200 rounded-lg">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Enter tile (e.g., 1D, east, joker):
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleInputConfirm();
                if (e.key === 'Escape') handleInputCancel();
              }}
              placeholder="1D, east, joker"
              className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex space-x-1">
              <button
                onClick={handleInputConfirm}
                className="flex-1 px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 min-h-[44px]"
              >
                ✓
              </button>
              <button
                onClick={handleInputCancel}
                className="flex-1 px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 min-h-[44px]"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tile count and validation */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>{tiles.length} / 14 tiles</span>
        {recommendations && (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Keep</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>Discard</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>Pass</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};