// frontend/src/components/tiles/TilePickerModal.tsx
// Modal for selecting/replacing tiles in hand - IMPROVED: All tiles in rows, no tabs

import React from 'react';
import type { Tile } from '../../types';
import TileComponent from './TileComponent';
import { createAllTiles, groupTilesBySuit, countTiles } from '../../utils/tile-utils';

interface TilePickerModalProps {
  isOpen: boolean;
  currentTile?: Tile | null;
  currentHand: Tile[];
  onTileSelect: (tile: Tile) => void;
  onRemoveTile: () => void;
  onClose: () => void;
  slotIndex: number;
}

const TilePickerModal: React.FC<TilePickerModalProps> = ({
  isOpen,
  currentTile,
  currentHand,
  onTileSelect,
  onRemoveTile,
  onClose,
  slotIndex
}) => {
  if (!isOpen) return null;

  const allTiles = createAllTiles();
  const groupedTiles = groupTilesBySuit(allTiles);
  const handCounts = countTiles(currentHand);

  // FIXED: Proper tile click handler
  const handleTileClick = (tile: Tile) => {
    console.log('TilePickerModal: Tile clicked', tile);
    onTileSelect(tile);
  };

  // FIXED: Proper remove handler
  const handleRemove = () => {
    console.log('TilePickerModal: Remove clicked');
    onRemoveTile();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Check if tile can be selected (not exceeding max count)
  const canSelectTile = (tile: Tile): boolean => {
    const currentCount = handCounts[tile.id] || 0;
    const maxCount = tile.id === 'joker' ? 8 : 4;
    
    // If this is replacing the current tile, don't count it
    if (currentTile && currentTile.id === tile.id) {
      return true;
    }
    
    return currentCount < maxCount;
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Select Tile for Slot {slotIndex + 1}
              </h2>
              {currentTile && (
                <p className="text-sm text-gray-600">
                  Current: <span className="font-mono font-medium">{currentTile.id}</span>
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors touch-manipulation"
              aria-label="Close tile picker"
            >
              ✕
            </button>
          </div>
          
          {/* FIXED: Remove button - now properly shows when currentTile exists */}
          {currentTile && (
            <button
              onClick={handleRemove}
              className="mt-3 w-full py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
            >
              🗑️ Remove Tile
            </button>
          )}
        </div>

        {/* IMPROVED: All tiles in organized rows - no tabs needed */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="space-y-6">
            
            {/* Dots */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Dots</h3>
              <div className="grid grid-cols-9 gap-3">
                {groupedTiles.dots.map(tile => {
                  const tileCount = handCounts[tile.id] || 0;
                  const isCurrentTile = currentTile?.id === tile.id;
                  const canSelect = canSelectTile(tile);
                  
                  return (
                    <div key={tile.id} className="relative">
                      <TileComponent
                        tile={tile}
                        isSelected={isCurrentTile}
                        isDisabled={!canSelect}
                        size="large"
                        onClick={canSelect ? handleTileClick : undefined}
                      />
                      
                      {/* Current tile indicator */}
                      {isCurrentTile && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">✓</span>
                        </div>
                      )}
                      
                      {/* Count indicator */}
                      {tileCount > 0 && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">{tileCount}</span>
                        </div>
                      )}
                      
                      {/* Disabled overlay */}
                      {!canSelect && (
                        <div className="absolute inset-0 bg-gray-300 bg-opacity-50 rounded-md flex items-center justify-center">
                          <span className="text-xs text-gray-600 font-medium">MAX</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bams */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Bams</h3>
              <div className="grid grid-cols-9 gap-3">
                {groupedTiles.bams.map(tile => {
                  const tileCount = handCounts[tile.id] || 0;
                  const isCurrentTile = currentTile?.id === tile.id;
                  const canSelect = canSelectTile(tile);
                  
                  return (
                    <div key={tile.id} className="relative">
                      <TileComponent
                        tile={tile}
                        isSelected={isCurrentTile}
                        isDisabled={!canSelect}
                        size="large"
                        onClick={canSelect ? handleTileClick : undefined}
                      />
                      
                      {isCurrentTile && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">✓</span>
                        </div>
                      )}
                      
                      {tileCount > 0 && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">{tileCount}</span>
                        </div>
                      )}
                      
                      {!canSelect && (
                        <div className="absolute inset-0 bg-gray-300 bg-opacity-50 rounded-md flex items-center justify-center">
                          <span className="text-xs text-gray-600 font-medium">MAX</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cracks */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Cracks</h3>
              <div className="grid grid-cols-9 gap-3">
                {groupedTiles.cracks.map(tile => {
                  const tileCount = handCounts[tile.id] || 0;
                  const isCurrentTile = currentTile?.id === tile.id;
                  const canSelect = canSelectTile(tile);
                  
                  return (
                    <div key={tile.id} className="relative">
                      <TileComponent
                        tile={tile}
                        isSelected={isCurrentTile}
                        isDisabled={!canSelect}
                        size="large"
                        onClick={canSelect ? handleTileClick : undefined}
                      />
                      
                      {isCurrentTile && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">✓</span>
                        </div>
                      )}
                      
                      {tileCount > 0 && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">{tileCount}</span>
                        </div>
                      )}
                      
                      {!canSelect && (
                        <div className="absolute inset-0 bg-gray-300 bg-opacity-50 rounded-md flex items-center justify-center">
                          <span className="text-xs text-gray-600 font-medium">MAX</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Honor Tiles Row */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Honor Tiles</h3>
              <div className="grid grid-cols-8 gap-3 max-w-2xl">
                {/* Winds */}
                {groupedTiles.winds.map(tile => {
                  const tileCount = handCounts[tile.id] || 0;
                  const isCurrentTile = currentTile?.id === tile.id;
                  const canSelect = canSelectTile(tile);
                  
                  return (
                    <div key={tile.id} className="relative">
                      <TileComponent
                        tile={tile}
                        isSelected={isCurrentTile}
                        isDisabled={!canSelect}
                        size="large"
                        onClick={canSelect ? handleTileClick : undefined}
                      />
                      
                      {isCurrentTile && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">✓</span>
                        </div>
                      )}
                      
                      {tileCount > 0 && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">{tileCount}</span>
                        </div>
                      )}
                      
                      {!canSelect && (
                        <div className="absolute inset-0 bg-gray-300 bg-opacity-50 rounded-md flex items-center justify-center">
                          <span className="text-xs text-gray-600 font-medium">MAX</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Dragons */}
                {groupedTiles.dragons.map(tile => {
                  const tileCount = handCounts[tile.id] || 0;
                  const isCurrentTile = currentTile?.id === tile.id;
                  const canSelect = canSelectTile(tile);
                  
                  return (
                    <div key={tile.id} className="relative">
                      <TileComponent
                        tile={tile}
                        isSelected={isCurrentTile}
                        isDisabled={!canSelect}
                        size="large"
                        onClick={canSelect ? handleTileClick : undefined}
                      />
                      
                      {isCurrentTile && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">✓</span>
                        </div>
                      )}
                      
                      {tileCount > 0 && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">{tileCount}</span>
                        </div>
                      )}
                      
                      {!canSelect && (
                        <div className="absolute inset-0 bg-gray-300 bg-opacity-50 rounded-md flex items-center justify-center">
                          <span className="text-xs text-gray-600 font-medium">MAX</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Joker */}
                {groupedTiles.jokers.map(tile => {
                  const tileCount = handCounts[tile.id] || 0;
                  const isCurrentTile = currentTile?.id === tile.id;
                  const canSelect = canSelectTile(tile);
                  
                  return (
                    <div key={tile.id} className="relative">
                      <TileComponent
                        tile={tile}
                        isSelected={isCurrentTile}
                        isDisabled={!canSelect}
                        size="large"
                        onClick={canSelect ? handleTileClick : undefined}
                      />
                      
                      {isCurrentTile && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">✓</span>
                        </div>
                      )}
                      
                      {tileCount > 0 && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">{tileCount}</span>
                        </div>
                      )}
                      
                      {!canSelect && (
                        <div className="absolute inset-0 bg-gray-300 bg-opacity-50 rounded-md flex items-center justify-center">
                          <span className="text-xs text-gray-600 font-medium">MAX</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Flowers */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Flowers</h3>
              <div className="grid grid-cols-4 gap-3 max-w-md">
                {groupedTiles.flowers.map(tile => {
                  const tileCount = handCounts[tile.id] || 0;
                  const isCurrentTile = currentTile?.id === tile.id;
                  const canSelect = canSelectTile(tile);
                  
                  return (
                    <div key={tile.id} className="relative">
                      <TileComponent
                        tile={tile}
                        isSelected={isCurrentTile}
                        isDisabled={!canSelect}
                        size="large"
                        onClick={canSelect ? handleTileClick : undefined}
                      />
                      
                      {isCurrentTile && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">✓</span>
                        </div>
                      )}
                      
                      {tileCount > 0 && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">{tileCount}</span>
                        </div>
                      )}
                      
                      {!canSelect && (
                        <div className="absolute inset-0 bg-gray-300 bg-opacity-50 rounded-md flex items-center justify-center">
                          <span className="text-xs text-gray-600 font-medium">MAX</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Tap a tile to select it for your hand
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TilePickerModal;