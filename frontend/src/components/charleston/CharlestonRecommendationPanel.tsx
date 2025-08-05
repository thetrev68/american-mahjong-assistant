// frontend/src/components/charleston/CharlestonRecommendationPanel.tsx
// Panel showing Charleston recommendation reasoning and strategy

import React, { useState } from 'react';
import type { CharlestonRecommendation } from '../../types/charleston-types';

interface CharlestonRecommendationPanelProps {
  recommendations: CharlestonRecommendation | null;
  currentPhase: 'right' | 'across' | 'left' | 'optional';
  isVisible: boolean;
  onToggleVisibility: () => void;
}

const CharlestonRecommendationPanel: React.FC<CharlestonRecommendationPanelProps> = ({
  recommendations,
  currentPhase,
  isVisible,
  onToggleVisibility
}) => {
  const [activeTab, setActiveTab] = useState<'strategy' | 'analysis' | 'alternatives'>('strategy');

  if (!recommendations) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="text-center text-gray-600">
          <div className="text-sm">No recommendations available</div>
          <div className="text-xs mt-1">Analysis will appear when tiles are entered</div>
        </div>
      </div>
    );
  }

  const phaseLabels = {
    right: 'Pass Right',
    across: 'Pass Across',
    left: 'Pass Left', 
    optional: 'Optional Pass'
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
      {/* Header with toggle */}
      <div className="bg-blue-100 p-3 border-b border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-blue-600">💡</span>
            <h3 className="font-medium text-blue-800">
              {phaseLabels[currentPhase]} Strategy
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(recommendations.confidence)}`}>
              {recommendations.confidence} confidence
            </span>
          </div>
          <button
            onClick={onToggleVisibility}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {isVisible ? 'Hide' : 'Show'} Details
          </button>
        </div>
      </div>

      {/* Collapsible content */}
      {isVisible && (
        <div className="p-4">
          {/* Tab navigation */}
          <div className="flex mb-3 bg-white rounded-lg p-1">
            {[
              { key: 'strategy', label: 'Strategy' },
              { key: 'analysis', label: 'Analysis' },
              { key: 'alternatives', label: 'Options' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'strategy' | 'analysis' | 'alternatives')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-500 text-white'
                    : 'text-blue-600 hover:bg-blue-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'strategy' && (
            <div className="space-y-3">
              {/* Overall strategy */}
              <div className="bg-white rounded-lg p-3">
                <h4 className="font-medium text-gray-800 mb-2">Overall Strategy</h4>
                <p className="text-sm text-gray-700">{recommendations.overallStrategy}</p>
              </div>

              {/* Pattern shift */}
              {recommendations.patternShift && (
                <div className="bg-white rounded-lg p-3">
                  <h4 className="font-medium text-gray-800 mb-2">Pattern Focus</h4>
                  <p className="text-sm text-gray-700">{recommendations.patternShift}</p>
                </div>
              )}

              {/* Phase advice */}
              {recommendations.phaseAdvice && (
                <div className="bg-white rounded-lg p-3">
                  <h4 className="font-medium text-gray-800 mb-2">Phase Advice</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div>
                      <span className="font-medium">What to expect:</span> {recommendations.phaseAdvice.whatToExpect}
                    </div>
                    <div>
                      <span className="font-medium">Next phase:</span> {recommendations.phaseAdvice.nextPhaseStrategy}
                    </div>
                    <div>
                      <span className="font-medium">Risk level:</span> {recommendations.phaseAdvice.riskAssessment}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-3">
              {/* Recommended tiles to pass */}
              <div className="bg-white rounded-lg p-3">
                <h4 className="font-medium text-red-700 mb-2">
                  Recommended to Pass ({recommendations.tilesToPass.length})
                </h4>
                {recommendations.tilesToPass.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {recommendations.tilesToPass.map((tile, index) => (
                      <span key={index} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-mono">
                        {tile.id}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No specific tiles recommended</p>
                )}
              </div>

              {/* Recommended tiles to keep */}
              <div className="bg-white rounded-lg p-3">
                <h4 className="font-medium text-green-700 mb-2">
                  Recommended to Keep ({recommendations.tilesToKeep.length})
                </h4>
                {recommendations.tilesToKeep.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {recommendations.tilesToKeep.map((tile, index) => (
                      <span key={index} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-mono">
                        {tile.id}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No specific tiles to prioritize</p>
                )}
              </div>

              {/* Current patterns */}
              {recommendations.currentPatterns && recommendations.currentPatterns.length > 0 && (
                <div className="bg-white rounded-lg p-3">
                  <h4 className="font-medium text-gray-800 mb-2">Current Patterns</h4>
                  <div className="space-y-1">
                    {recommendations.currentPatterns.map((pattern, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">{pattern.name}</span>
                        <span className="text-gray-600 ml-2">({pattern.points} pts)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'alternatives' && (
            <div className="space-y-3">
              {recommendations.alternativeOptions && recommendations.alternativeOptions.length > 0 ? (
                recommendations.alternativeOptions.map((option, index) => (
                  <div key={index} className="bg-white rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-800">
                        Option {index + 1}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(option.confidence)}`}>
                        {option.confidence}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {option.tiles.map((tile, tileIndex) => (
                        <span key={tileIndex} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-mono">
                          {tile.id}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-700">{option.reasoning}</p>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-600">No alternative options available</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CharlestonRecommendationPanel;