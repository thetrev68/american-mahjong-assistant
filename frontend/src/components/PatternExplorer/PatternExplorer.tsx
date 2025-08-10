// frontend/src/components/PatternExplorer/PatternExplorer.tsx
// Comprehensive pattern exploration and search interface

import React, { useState, useEffect, useMemo } from 'react';
import { PatternSearchEngine, type PatternSearchFilters, type PatternSearchResult, type PatternCategory } from '../../utils/pattern-search-engine';

interface PatternExplorerProps {
  onPatternSelect?: (result: PatternSearchResult) => void;
  initialFilters?: PatternSearchFilters;
  showStats?: boolean;
}

export const PatternExplorer: React.FC<PatternExplorerProps> = ({
  onPatternSelect,
  initialFilters = {},
  showStats = true
}) => {
  const [filters, setFilters] = useState<PatternSearchFilters>(initialFilters);
  const [searchText, setSearchText] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [results, setResults] = useState<PatternSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get filter presets and stats
  const filterPresets = useMemo(() => PatternSearchEngine.getFilterPresets(), []);
  const stats = useMemo(() => PatternSearchEngine.getPatternStatistics(), []);

  // Perform search when filters change
  useEffect(() => {
    setIsLoading(true);
    const searchFilters = { ...filters, searchText: searchText.trim() || undefined };
    
    try {
      const searchResults = PatternSearchEngine.searchPatterns(searchFilters);
      setResults(searchResults);
    } catch (error) {
      console.error('Pattern search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, searchText]);

  const handlePresetChange = (presetKey: string) => {
    setSelectedPreset(presetKey);
    if (presetKey && filterPresets[presetKey]) {
      setFilters(filterPresets[presetKey]);
      setSearchText('');
    } else {
      setFilters({});
      setSearchText('');
    }
  };

  const handleFilterChange = (key: keyof PatternSearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setSelectedPreset(''); // Clear preset when manually filtering
  };

  const clearFilters = () => {
    setFilters({});
    setSearchText('');
    setSelectedPreset('');
  };

  const difficultyOptions = ['easy', 'medium', 'hard'] as const;
  const categoryOptions: PatternCategory[] = [
    'year_hands', 'like_numbers', 'consecutive', 'honors', 
    'mixed', 'flowers', 'sequences', 'singles_pairs', 'pungs_kongs'
  ];

  const getCategoryLabel = (category: PatternCategory): string => {
    const labels = {
      year_hands: '2025 Year Hands',
      like_numbers: 'Like Numbers',
      consecutive: 'Consecutive',
      honors: 'Winds & Dragons',
      mixed: 'Mixed Patterns',
      flowers: 'Flowers',
      sequences: 'Sequences',
      singles_pairs: 'Singles & Pairs',
      pungs_kongs: 'Pungs & Kongs'
    };
    return labels[category];
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPointsColor = (points: number): string => {
    if (points >= 50) return 'text-purple-700 font-bold';
    if (points >= 35) return 'text-blue-600 font-semibold';
    if (points >= 30) return 'text-green-600';
    return 'text-gray-600';
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">NMJL 2025 Pattern Explorer</h1>
        <p className="text-gray-600">Search and explore all 71 authentic National Mah Jongg League patterns</p>
      </div>

      {/* Quick Stats */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalPatterns}</div>
            <div className="text-sm text-gray-600">Total Patterns</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.averagePoints}</div>
            <div className="text-sm text-gray-600">Avg Points</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.jokerPatterns}</div>
            <div className="text-sm text-gray-600">Allow Jokers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.concealedPatterns}</div>
            <div className="text-sm text-gray-600">Concealed Only</div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
        {/* Search Bar */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Search Patterns</label>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by name, description, or pattern..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Quick Presets */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Quick Filters</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handlePresetChange('')}
              className={`px-3 py-1 text-sm rounded-full border ${
                selectedPreset === '' 
                  ? 'bg-blue-100 border-blue-300 text-blue-700' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              All Patterns
            </button>
            {Object.entries(filterPresets).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handlePresetChange(key)}
                className={`px-3 py-1 text-sm rounded-full border ${
                  selectedPreset === key 
                    ? 'bg-blue-100 border-blue-300 text-blue-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
          {/* Difficulty Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Difficulty</label>
            <div className="space-y-1">
              {difficultyOptions.map(difficulty => (
                <label key={difficulty} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.difficulty?.includes(difficulty) || false}
                    onChange={(e) => {
                      const current = filters.difficulty || [];
                      const updated = e.target.checked
                        ? [...current, difficulty]
                        : current.filter(d => d !== difficulty);
                      handleFilterChange('difficulty', updated.length > 0 ? updated : undefined);
                    }}
                    className="mr-2 rounded"
                  />
                  <span className="text-sm capitalize">{difficulty}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Points Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Points Range</label>
            <div className="space-y-2">
              <input
                type="range"
                min="25"
                max="75"
                value={filters.pointRange?.min || 25}
                onChange={(e) => {
                  const min = parseInt(e.target.value);
                  const max = filters.pointRange?.max || 75;
                  handleFilterChange('pointRange', { min: Math.min(min, max), max });
                }}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{filters.pointRange?.min || 25}</span>
                <span>{filters.pointRange?.max || 75}</span>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Categories</label>
            <select
              multiple
              value={filters.categories || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value as PatternCategory);
                handleFilterChange('categories', selected.length > 0 ? selected : undefined);
              }}
              className="w-full h-24 px-2 py-1 text-sm border border-gray-300 rounded"
            >
              {categoryOptions.map(category => (
                <option key={category} value={category}>
                  {getCategoryLabel(category)}
                </option>
              ))}
            </select>
          </div>

          {/* Special Options */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Special Options</label>
            <div className="space-y-1">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.allowsJokers === true}
                  onChange={(e) => handleFilterChange('allowsJokers', e.target.checked || undefined)}
                  className="mr-2 rounded"
                />
                <span className="text-sm">Allows Jokers</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.isConcealed === true}
                  onChange={(e) => handleFilterChange('isConcealed', e.target.checked || undefined)}
                  className="mr-2 rounded"
                />
                <span className="text-sm">Concealed Only</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.usesFlowers === true}
                  onChange={(e) => handleFilterChange('usesFlowers', e.target.checked || undefined)}
                  className="mr-2 rounded"
                />
                <span className="text-sm">Uses Flowers</span>
              </label>
            </div>
          </div>
        </div>

        {/* Clear Filters */}
        <div className="pt-2 border-t">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {isLoading ? 'Searching...' : `${results.length} Patterns Found`}
          </h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((result, index) => (
              <div
                key={`${result.pattern["Pattern ID"]}-${index}`}
                className={`bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow ${
                  onPatternSelect ? 'cursor-pointer hover:border-blue-300' : ''
                }`}
                onClick={() => onPatternSelect?.(result)}
              >
                {/* Pattern Header */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(result.pattern.Hand_Difficulty)}`}>
                      {result.pattern.Hand_Difficulty}
                    </span>
                    <span className={`text-lg font-bold ${getPointsColor(result.pattern.Hand_Points)}`}>
                      {result.pattern.Hand_Points} pts
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">
                    {getCategoryLabel(result.category)}
                  </div>
                </div>

                {/* Pattern Content */}
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900 leading-tight">
                    {result.highlightedText ? (
                      <span dangerouslySetInnerHTML={{ __html: result.highlightedText }} />
                    ) : (
                      result.pattern.Hand_Description
                    )}
                  </h3>
                  <div className="font-mono text-sm text-blue-600 bg-blue-50 p-2 rounded">
                    {result.pattern.Hand_Pattern}
                  </div>
                </div>

                {/* Pattern Details */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>ID: {result.pattern["Pattern ID"]}</span>
                    <div className="flex space-x-2">
                      {result.pattern.Hand_Conceiled && (
                        <span className="px-2 py-1 bg-gray-100 rounded">Concealed</span>
                      )}
                      {result.pattern.Groups?.some(g => g.Jokers_Allowed) && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">Jokers OK</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Match Score (for debugging) */}
                {result.matchScore > 10 && (
                  <div className="mt-2 text-xs text-gray-400">
                    Relevance: {Math.round(result.matchScore)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!isLoading && results.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No patterns match your current filters.</p>
            <button
              onClick={clearFilters}
              className="mt-2 text-blue-600 hover:text-blue-800 underline"
            >
              Clear filters to see all patterns
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatternExplorer;