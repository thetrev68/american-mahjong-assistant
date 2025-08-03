// frontend/src/pages/TileInputTest.tsx
import React, { useState } from 'react';
import type { Tile } from '../types';
import TileGrid from '../components/tiles/TileGrid';
import { addTile, removeTile, validateTileCollection, sortTiles } from '../utils/tile-utils';

const TileInputTest: React.FC = () => {
  const [selectedTiles, setSelectedTiles] = useState<Tile[]>([]);
  const [mode, setMode] = useState<'input' | 'selection' | 'display'>('input');

  // Handle tile selection/deselection
  const handleTileSelect = (tile: Tile) => {
    const isSelected = selectedTiles.some(t => t.id === tile.id);
    
    if (isSelected) {
      // Remove one instance of this tile
      setSelectedTiles(prev => removeTile(prev, tile));
    } else {
      // Add this tile
      setSelectedTiles(prev => addTile(prev, tile));
    }
  };

  // Clear all tiles
  const handleClearAll = () => {
    setSelectedTiles([]);
  };

  // Add some sample tiles for testing
  const handleAddSampleHand = () => {
    const sampleTiles: Tile[] = [
      { id: '1D', suit: 'dots', value: '1' },
      { id: '1D', suit: 'dots', value: '1' },
      { id: '2D', suit: 'dots', value: '2' },
      { id: '3D', suit: 'dots', value: '3' },
      { id: '1B', suit: 'bams', value: '1' },
      { id: '1B', suit: 'bams', value: '1' },
      { id: '1B', suit: 'bams', value: '1' },
      { id: 'east', suit: 'winds', value: 'east' },
      { id: 'east', suit: 'winds', value: 'east' },
      { id: 'red', suit: 'dragons', value: 'red' },
      { id: 'red', suit: 'dragons', value: 'red' },
      { id: 'joker', suit: 'jokers', value: 'joker' },
      { id: 'f1', suit: 'flowers', value: 'f1' }
    ];
    setSelectedTiles(sampleTiles);
  };

  const validation = validateTileCollection(selectedTiles);
  const sortedTiles = sortTiles(selectedTiles);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🀄 Tile Input Test
          </h1>
          <p className="text-gray-600">
            Test the American Mahjong tile selection interface
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-wrap gap-4 justify-center">
          <button
            onClick={handleAddSampleHand}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Sample Hand
          </button>
          <button
            onClick={handleClearAll}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            disabled={selectedTiles.length === 0}
          >
            Clear All
          </button>
          
          {/* Mode selector */}
          <div className="flex bg-gray-200 rounded-lg overflow-hidden">
            {(['input', 'selection', 'display'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  mode === m 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Status Info */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Total Tiles</h3>
            <p className="text-2xl font-bold text-blue-600">{selectedTiles.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Unique Tiles</h3>
            <p className="text-2xl font-bold text-green-600">
              {new Set(selectedTiles.map(t => t.id)).size}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Validation</h3>
            <p className={`text-2xl font-bold ${validation.isValid ? 'text-green-600' : 'text-red-600'}`}>
              {validation.isValid ? '✓ Valid' : '✗ Invalid'}
            </p>
          </div>
        </div>

        {/* Validation Errors */}
        {!validation.isValid && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="text-sm font-medium text-red-800 mb-2">Validation Errors:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {validation.errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Main Tile Grid */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <TileGrid
            selectedTiles={selectedTiles}
            onTileSelect={handleTileSelect}
            mode={mode}
            showCounts={true}
          />
        </div>

        {/* Selected Tiles Preview */}
        {selectedTiles.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Your Hand ({selectedTiles.length} tiles)
            </h3>
            <div className="flex flex-wrap gap-2">
              {sortedTiles.map((tile, index) => (
                <div
                  key={`${tile.id}-${index}`}
                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium"
                >
                  {tile.id}
                </div>
              ))}
            </div>
            
            {/* JSON output for debugging */}
            <details className="mt-4">
              <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                View JSON (for debugging)
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(sortedTiles, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">How to Use</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Tap tiles</strong> to select/deselect them</li>
            <li>• <strong>Red numbers</strong> show how many of each tile you have</li>
            <li>• <strong>Blue border</strong> indicates selected tiles</li>
            <li>• <strong>Maximum 4</strong> of each tile type (except jokers: 8)</li>
            <li>• <strong>Switch modes</strong> to test different interface states</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TileInputTest;