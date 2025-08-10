// frontend/src/components/PatternExplorer/PatternDetailView.tsx
// Detailed view of a specific NMJL pattern with comprehensive information

import React, { useMemo } from 'react';
import { PatternSearchEngine } from '../../utils/pattern-search-engine';
import type { NMJL2025Pattern } from '../../types/nmjl-2025-types';

interface PatternDetailViewProps {
  pattern: NMJL2025Pattern;
  onClose?: () => void;
  onSimilarPatternClick?: (pattern: NMJL2025Pattern) => void;
}

export const PatternDetailView: React.FC<PatternDetailViewProps> = ({
  pattern,
  onClose,
  onSimilarPatternClick
}) => {
  // Find similar patterns
  const similarPatterns = useMemo(() => {
    return PatternSearchEngine.findSimilarPatterns(pattern, 4);
  }, [pattern]);

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'hard': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getPointsColor = (points: number): string => {
    if (points >= 50) return 'text-purple-700';
    if (points >= 35) return 'text-blue-600';
    if (points >= 30) return 'text-green-600';
    return 'text-gray-600';
  };

  const formatGroupInfo = (groups: NonNullable<NMJL2025Pattern['Groups']>) => {
    return groups.map((group, index) => ({
      index: index + 1,
      type: group.Constraint_Type || 'unknown',
      values: group.Constraint_Values || '',
      suit: group.Suit_Role || 'any',
      jokersAllowed: group.Jokers_Allowed || false,
      note: group.Suit_Note || null
    }));
  };

  const groupInfo = pattern.Groups ? formatGroupInfo(pattern.Groups) : [];

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(pattern.Hand_Difficulty)} bg-white`}>
                {pattern.Hand_Difficulty}
              </span>
              <span className="text-2xl font-bold">
                {pattern.Hand_Points} Points
              </span>
            </div>
            <h1 className="text-2xl font-bold">{pattern.Hand_Description}</h1>
            <div className="font-mono text-lg bg-white/20 rounded px-3 py-2">
              {pattern.Hand_Pattern}
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl font-bold leading-none"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Pattern Information</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">Pattern ID:</span>
                <span className="text-gray-600">#{pattern["Pattern ID"]}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Section:</span>
                <span className="text-gray-600">{pattern.Section}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Line:</span>
                <span className="text-gray-600">{pattern.Line}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Year:</span>
                <span className="text-gray-600">{pattern.Year}</span>
              </div>
              {pattern.Hands_Key && (
                <div className="flex justify-between">
                  <span className="font-medium">Key:</span>
                  <span className="text-gray-600 font-mono text-sm">{pattern.Hands_Key}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Special Properties</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Concealed Only:</span>
                <span className={`px-2 py-1 rounded text-sm ${pattern.Hand_Conceiled ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {pattern.Hand_Conceiled ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Jokers Allowed:</span>
                <span className={`px-2 py-1 rounded text-sm ${
                  pattern.Groups?.some(g => g.Jokers_Allowed) 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {pattern.Groups?.some(g => g.Jokers_Allowed) ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Number of Groups:</span>
                <span className="text-gray-600">{pattern.Groups?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Difficulty Level:</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${getDifficultyColor(pattern.Hand_Difficulty)}`}>
                  {pattern.Hand_Difficulty}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Group Breakdown */}
        {groupInfo.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Pattern Groups</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {groupInfo.map((group) => (
                <div key={group.index} className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Group {group.index}</h3>
                    <span className="text-sm text-gray-500 uppercase">{group.type}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Values:</span>
                      <span className="font-mono text-blue-600">{group.values || 'Any'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Suit Role:</span>
                      <span className="capitalize">{group.suit}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Jokers:</span>
                      <span className={group.jokersAllowed ? 'text-purple-600' : 'text-gray-500'}>
                        {group.jokersAllowed ? 'Allowed' : 'Not allowed'}
                      </span>
                    </div>
                    {group.note && (
                      <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                        Note: {group.note}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hand Notes */}
        {pattern.Hand_Notes && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-gray-700">{pattern.Hand_Notes}</p>
            </div>
          </div>
        )}

        {/* Similar Patterns */}
        {similarPatterns.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Similar Patterns</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {similarPatterns.map((similar, index) => (
                <div
                  key={`${similar.pattern["Pattern ID"]}-${index}`}
                  className={`border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors ${
                    onSimilarPatternClick ? 'cursor-pointer hover:border-blue-300' : ''
                  }`}
                  onClick={() => onSimilarPatternClick?.(similar.pattern)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(similar.pattern.Hand_Difficulty)}`}>
                      {similar.pattern.Hand_Difficulty}
                    </span>
                    <span className={`font-bold ${getPointsColor(similar.pattern.Hand_Points)}`}>
                      {similar.pattern.Hand_Points} pts
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900 text-sm mb-2">
                    {similar.pattern.Hand_Description}
                  </h3>
                  <div className="font-mono text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    {similar.pattern.Hand_Pattern}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {Math.round(similar.matchScore * 100)}% similar
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strategic Tips */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Strategic Tips</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="space-y-2 text-sm text-gray-700">
              <p><strong>Difficulty:</strong> This is a <strong>{pattern.Hand_Difficulty}</strong> pattern worth <strong>{pattern.Hand_Points} points</strong>.</p>
              
              {pattern.Hand_Conceiled && (
                <p><strong>Concealed:</strong> This pattern must be kept concealed - you cannot call tiles from other players.</p>
              )}
              
              {pattern.Groups?.some(g => g.Jokers_Allowed) ? (
                <p><strong>Jokers:</strong> Jokers can be used to substitute for missing tiles in this pattern.</p>
              ) : (
                <p><strong>Jokers:</strong> This pattern requires exact tiles - jokers cannot be used as substitutes.</p>
              )}
              
              <p><strong>Groups:</strong> This pattern consists of {pattern.Groups?.length || 0} distinct groups that must be completed.</p>
              
              {pattern.Hand_Difficulty === 'easy' && (
                <p><strong>Beginner Friendly:</strong> This is a good pattern for new players to attempt.</p>
              )}
              
              {pattern.Hand_Difficulty === 'hard' && (
                <p><strong>Advanced Strategy:</strong> This challenging pattern requires careful planning and tile management.</p>
              )}
              
              {pattern.Hand_Points >= 50 && (
                <p><strong>High Value:</strong> This premium pattern offers excellent scoring potential but may be harder to complete.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatternDetailView;