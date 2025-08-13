// frontend/src/components/PrivateHandView/HandAnalysisPanel.tsx
// Displays strategic analysis and recommendations for the player's hand

import React, { useState } from 'react';
import type { HandAnalysis, Tile, PatternMatch } from '../../types';

interface HandAnalysisPanelProps {
  analysis: HandAnalysis | null;
  isLoading: boolean;
  selectedTiles: Tile[];
}

type AnalysisTab = 'patterns' | 'recommendations' | 'defense';

export const HandAnalysisPanel: React.FC<HandAnalysisPanelProps> = ({
  analysis,
  isLoading,
  selectedTiles
}) => {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('patterns');

  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-blue-700 text-sm">Analyzing your hand...</span>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600 text-sm">No analysis available</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg overflow-hidden">
      {/* Tab navigation */}
      <div className="border-b border-blue-200 bg-white/50">
        <div className="flex">
          <button
            onClick={() => setActiveTab('patterns')}
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              activeTab === 'patterns'
                ? 'text-blue-700 bg-blue-100 border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            Patterns ({analysis.bestPatterns.length})
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              activeTab === 'recommendations'
                ? 'text-blue-700 bg-blue-100 border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            Strategy
          </button>
          <button
            onClick={() => setActiveTab('defense')}
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              activeTab === 'defense'
                ? 'text-blue-700 bg-blue-100 border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            Defense
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="p-4">
        {activeTab === 'patterns' && (
          <PatternsTab 
            patterns={analysis.bestPatterns}
            probabilities={analysis.probabilities}
          />
        )}
        
        {activeTab === 'recommendations' && (
          <RecommendationsTab 
            recommendations={analysis.recommendations}
            selectedTiles={selectedTiles}
          />
        )}
        
        {activeTab === 'defense' && (
          <DefenseTab 
            threats={analysis.threats}
          />
        )}
      </div>
    </div>
  );
};

// Patterns tab component
const PatternsTab: React.FC<{
  patterns: PatternMatch[];
  probabilities: { completion: number; turnsEstimate: number };
}> = ({ patterns, probabilities }) => {
  if (patterns.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-gray-600">No clear patterns detected</p>
        <p className="text-sm text-gray-500 mt-1">Try focusing on like numbers or similar tiles</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top pattern with probability */}
      <div className="bg-white rounded-lg p-3 border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-900">Best Pattern</h4>
          <span className="text-sm text-blue-600 font-medium">
            {Math.round(probabilities.completion * 100)}% likely
          </span>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-blue-700">{patterns[0].pattern.name}</span>
            <span className="text-sm text-gray-600">
              {Math.round(patterns[0].completion * 100)}% complete
            </span>
          </div>
          
          <p className="text-sm text-gray-600">{patterns[0].pattern.description}</p>
          
          {patterns[0].missingTiles.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Need:</p>
              <div className="flex flex-wrap gap-1">
                {patterns[0].missingTiles.map((tile, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded"
                  >
                    {tile.id}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Points: {patterns[0].pattern.points}</span>
            <span className="text-gray-600">~{probabilities.turnsEstimate} turns</span>
          </div>
        </div>
      </div>

      {/* Other patterns */}
      {patterns.slice(1, 3).map((pattern, index) => (
        <div key={index} className="bg-white/70 rounded-lg p-3 border border-blue-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{pattern.pattern.name}</span>
            <span className="text-xs text-gray-500">
              {Math.round(pattern.completion * 100)}% complete
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">{pattern.pattern.description}</p>
        </div>
      ))}
    </div>
  );
};

// Recommendations tab component
const RecommendationsTab: React.FC<{
  recommendations: { keep: Tile[]; discard: Tile[]; charleston: Tile[] };
  selectedTiles: Tile[];
}> = ({ recommendations, selectedTiles }) => {
  const getRecommendationForTile = (tile: Tile): 'keep' | 'discard' | 'charleston' | null => {
    if (recommendations.keep.some(t => t.id === tile.id)) return 'keep';
    if (recommendations.discard.some(t => t.id === tile.id)) return 'discard';
    if (recommendations.charleston.some(t => t.id === tile.id)) return 'charleston';
    return null;
  };

  const selectedRecommendations = selectedTiles.map(tile => ({
    tile,
    recommendation: getRecommendationForTile(tile)
  }));

  return (
    <div className="space-y-4">
      {/* Selection feedback */}
      {selectedTiles.length > 0 && (
        <div className="bg-white rounded-lg p-3 border border-blue-200">
          <h4 className="font-medium text-gray-900 mb-2">Selected Tiles Analysis</h4>
          <div className="space-y-1">
            {selectedRecommendations.map(({ tile, recommendation }, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="font-mono">{tile.id}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  recommendation === 'keep' ? 'bg-red-100 text-red-700' :
                  recommendation === 'discard' ? 'bg-green-100 text-green-700' :
                  recommendation === 'charleston' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {recommendation === 'keep' ? 'Not recommended' :
                   recommendation === 'discard' ? 'Good choice' :
                   recommendation === 'charleston' ? 'Pass this' :
                   'Neutral'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keep recommendations */}
      <div className="bg-white rounded-lg p-3 border border-green-200">
        <h4 className="font-medium text-green-800 mb-2 flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          Keep These ({recommendations.keep.length})
        </h4>
        {recommendations.keep.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {recommendations.keep.map((tile, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-mono"
              >
                {tile.id}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">No specific tiles to keep</p>
        )}
      </div>

      {/* Discard recommendations */}
      <div className="bg-white rounded-lg p-3 border border-red-200">
        <h4 className="font-medium text-red-800 mb-2 flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
          Consider Discarding ({recommendations.discard.length})
        </h4>
        {recommendations.discard.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {recommendations.discard.map((tile, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-mono"
              >
                {tile.id}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">No tiles recommended for discard</p>
        )}
      </div>

      {/* Charleston recommendations */}
      {recommendations.charleston.length > 0 && (
        <div className="bg-white rounded-lg p-3 border border-yellow-200">
          <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            Charleston Pass ({recommendations.charleston.length})
          </h4>
          <div className="flex flex-wrap gap-1">
            {recommendations.charleston.map((tile, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded font-mono"
              >
                {tile.id}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Defense tab component
const DefenseTab: React.FC<{
  threats: {
    dangerousTiles: Tile[];
    safeTiles: Tile[];
    opponentThreats: {
      playerId: string;
      suspectedPatterns: string[];
      dangerLevel: 'low' | 'medium' | 'high';
    }[];
  };
}> = ({ threats }) => {
  const getDangerColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Opponent threats */}
      {threats.opponentThreats.length > 0 && (
        <div className="bg-white rounded-lg p-3 border border-red-200">
          <h4 className="font-medium text-red-800 mb-3">Opponent Analysis</h4>
          <div className="space-y-2">
            {threats.opponentThreats.map((threat, index) => (
              <div key={index} className={`p-2 rounded border ${getDangerColor(threat.dangerLevel)}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Player {threat.playerId}</span>
                  <span className="text-xs capitalize font-medium">{threat.dangerLevel} threat</span>
                </div>
                {threat.suspectedPatterns.length > 0 && (
                  <div className="text-xs">
                    <span className="text-gray-600">Likely patterns: </span>
                    <span>{threat.suspectedPatterns.join(', ')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dangerous tiles */}
      <div className="bg-white rounded-lg p-3 border border-red-200">
        <h4 className="font-medium text-red-800 mb-2 flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
          Dangerous to Discard ({threats.dangerousTiles.length})
        </h4>
        {threats.dangerousTiles.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {threats.dangerousTiles.map((tile, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-mono"
              >
                {tile.id}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">No specific dangerous tiles identified</p>
        )}
      </div>

      {/* Safe tiles */}
      <div className="bg-white rounded-lg p-3 border border-green-200">
        <h4 className="font-medium text-green-800 mb-2 flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          Safe to Discard ({threats.safeTiles.length})
        </h4>
        {threats.safeTiles.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {threats.safeTiles.map((tile, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-mono"
              >
                {tile.id}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">No safe tiles identified</p>
        )}
      </div>

      {/* Defense tips */}
      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2">Defense Tips</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Watch what opponents pick up from discards</li>
          <li>• Avoid discarding tiles others have recently picked</li>
          <li>• Keep defensive tiles if multiple opponents seem close</li>
          <li>• Consider switching to a defensive hand if threats are high</li>
        </ul>
      </div>
    </div>
  );
};