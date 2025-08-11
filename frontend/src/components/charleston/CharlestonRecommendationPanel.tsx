// frontend/src/components/charleston/CharlestonRecommendationPanel.tsx
// Charleston-focused recommendation display with phase-specific guidance

import React, { useState } from 'react';
import type { CharlestonRecommendation, CharlestonPhase } from '../../types/charleston-types';
import type { Tile } from '../../types';

interface CharlestonRecommendationPanelProps {
  recommendations: CharlestonRecommendation | null;
  currentPhase: CharlestonPhase;
  selectedTiles?: Tile[]; // Make prop optional
  isLoading?: boolean;
}

const CharlestonRecommendationPanel: React.FC<CharlestonRecommendationPanelProps> = ({
  recommendations,
  currentPhase,
  selectedTiles = [], // Provide a default value
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState<'strategy' | 'analysis' | 'alternatives'>('strategy');

  const tabs = [
    { key: 'strategy' as const, label: 'Strategy', icon: '🎯' },
    { key: 'analysis' as const, label: 'Analysis', icon: '🔍' },
    { key: 'alternatives' as const, label: 'Options', icon: '⚡' }
  ];

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'certain': return 'bg-green-500 text-white';
      case 'high': return 'bg-blue-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-gray-400 text-white';
      default: return 'bg-gray-300 text-gray-700';
    }
  };

  const getPhaseDisplayName = (phase: CharlestonPhase) => {
    switch (phase) {
      case 'right': return 'Pass Right';
      case 'across': return 'Pass Across';
      case 'left': return 'Pass Left';
      case 'optional': return 'Optional Pass';
      case 'complete': return 'Complete';
      default: return phase;
    }
  };

  const getActionColor = (action: 'pass' | 'keep' | 'neutral') => {
    switch (action) {
      case 'pass': return 'bg-red-100 text-red-700 border-red-200';
      case 'keep': return 'bg-green-100 text-green-700 border-green-200';
      case 'neutral': return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getActionIcon = (action: 'pass' | 'keep' | 'neutral') => {
    switch (action) {
      case 'pass': return '➡️';
      case 'keep': return '✋';
      case 'neutral': return '🤷‍♀️';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-yellow-50 rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded mb-2"></div>
          <div className="h-20 bg-gray-300 rounded"></div>
        </div>
        <p className="text-sm text-gray-600 mt-2">Analyzing Charleston strategy...</p>
      </div>
    );
  }

  if (!recommendations) {
    return (
      <div className="bg-yellow-50 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-600">
          Input your tiles to get Charleston passing recommendations
        </p>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 rounded-lg p-4 space-y-4">
      {/* Header with phase and confidence */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Charleston: {getPhaseDisplayName(currentPhase)}
          </h3>
          <p className="text-sm text-gray-600">Strategic passing guidance</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getConfidenceColor(recommendations.confidence)}`}>
          {recommendations.confidence} confidence
        </span>
      </div>

      {/* Selected tiles feedback */}
      {selectedTiles.length > 0 && (
        <div className="bg-white rounded-lg p-3 border border-yellow-200">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
            <span className="mr-2">📝</span>
            Your Selection ({selectedTiles.length}/3)
          </h4>
          <div className="flex flex-wrap gap-1 mb-2">
            {selectedTiles.map((tile, index) => (
              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-mono">
                {tile.id}
              </span>
            ))}
          </div>
          {selectedTiles.length < 3 && (
            <p className="text-xs text-gray-600">Select {3 - selectedTiles.length} more tile{3 - selectedTiles.length > 1 ? 's' : ''}</p>
          )}
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex space-x-1 bg-white rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center space-x-1 ${
              activeTab === tab.key
                ? 'bg-yellow-500 text-white'
                : 'text-gray-600 hover:bg-yellow-100'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'strategy' && (
        <div className="space-y-3">
          {/* Overall strategy */}
          <div className="bg-white rounded-lg p-3">
            <h4 className="font-medium text-gray-800 mb-2 flex items-center">
              <span className="mr-2">🎯</span>
              Overall Strategy
            </h4>
            <p className="text-sm text-gray-700">{recommendations.overallStrategy}</p>
          </div>

          {/* Pattern shift */}
          {recommendations.patternShift && (
            <div className="bg-white rounded-lg p-3">
              <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                <span className="mr-2">🔄</span>
                Pattern Focus
              </h4>
              <p className="text-sm text-gray-700">{recommendations.patternShift}</p>
            </div>
          )}

          {/* Phase advice */}
          {recommendations.phaseAdvice && (
            <div className="bg-white rounded-lg p-3">
              <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                <span className="mr-2">💡</span>
                Phase Guidance
              </h4>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="bg-blue-50 p-2 rounded">
                  <span className="font-medium text-blue-800">What to expect:</span>
                  <p className="text-blue-700 mt-1">{recommendations.phaseAdvice.whatToExpect}</p>
                </div>
                <div className="bg-green-50 p-2 rounded">
                  <span className="font-medium text-green-800">Next phase:</span>
                  <p className="text-green-700 mt-1">{recommendations.phaseAdvice.nextPhaseStrategy}</p>
                </div>
                <div className="bg-amber-50 p-2 rounded">
                  <span className="font-medium text-amber-800">Risk assessment:</span>
                  <p className="text-amber-700 mt-1">{recommendations.phaseAdvice.riskAssessment}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="space-y-3">
          {/* Tile recommendation summary */}
          <div className="bg-white rounded-lg p-3">
            <h4 className="font-medium text-gray-800 mb-2 flex items-center">
              <span className="mr-2">🎯</span>
              Recommendations Summary
            </h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-red-50 p-2 rounded">
                <div className="text-lg font-bold text-red-700">{recommendations.tilesToPass?.length || 0}</div>
                <div className="text-xs text-red-600">Pass (red highlight)</div>
              </div>
              <div className="bg-green-50 p-2 rounded">
                <div className="text-lg font-bold text-green-700">{recommendations.tilesToKeep?.length || 0}</div>
                <div className="text-xs text-green-600">Keep (green highlight)</div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-lg font-bold text-gray-700">{(14 - (recommendations.tilesToPass?.length || 0) - (recommendations.tilesToKeep?.length || 0))}</div>
                <div className="text-xs text-gray-600">Neutral</div>
              </div>
            </div>
          </div>

          {/* Detailed tile analysis */}
          {recommendations?.tileAnalysis && recommendations.tileAnalysis.length > 0 && (
            <div className="bg-white rounded-lg p-3">
              <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                <span className="mr-2">🔍</span>
                Detailed Analysis
              </h4>
              <div className="space-y-2">
                {recommendations.tileAnalysis
                  .filter(analysis => analysis.action !== 'neutral' || analysis.priority >= 6)
                  .slice(0, 5)
                  .map((analysis, index) => (
                    <div 
                      key={index}
                      className={`p-2 rounded border ${getActionColor(analysis.action)}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span>{getActionIcon(analysis.action)}</span>
                          <span className="font-mono text-sm font-medium">{analysis.tile.id}</span>
                          <span className={`px-1 py-0.5 rounded text-xs ${getConfidenceColor(analysis.confidence)}`}>
                            {analysis.confidence}
                          </span>
                        </div>
                        <span className="text-xs font-medium">Priority: {analysis.priority}</span>
                      </div>
                      <p className="text-xs">{analysis.reasoning}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Current patterns */}
          {recommendations.currentPatterns && recommendations.currentPatterns.length > 0 && (
            <div className="bg-white rounded-lg p-3">
              <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                <span className="mr-2">📋</span>
                Current Patterns
              </h4>
              <div className="space-y-1">
                {recommendations.currentPatterns.slice(0, 3).map((pattern, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{pattern.name}</span>
                    <span className="text-gray-600">({pattern.points} pts)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'alternatives' && (
        <div className="space-y-3">
          <div className="bg-white rounded-lg p-3">
            <h4 className="font-medium text-gray-800 mb-2 flex items-center">
              <span className="mr-2">⚡</span>
              Alternative Passing Options
            </h4>
            {recommendations.alternativeOptions && recommendations.alternativeOptions.length > 0 ? (
              <div className="space-y-3">
                {recommendations.alternativeOptions.map((option, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-800">
                        Option {index + 1}
                      </h5>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(option.confidence)}`}>
                        {option.confidence}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {option.tiles.map((tile, tileIndex) => (
                        <span key={tileIndex} className="px-2 py-1 bg-white text-gray-700 text-xs rounded font-mono border border-gray-300">
                          {tile.id}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-700">{option.reasoning}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-sm text-gray-600">No alternative options available</p>
                <p className="text-xs text-gray-500 mt-1">The recommended tiles are the clear best choice</p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default CharlestonRecommendationPanel;