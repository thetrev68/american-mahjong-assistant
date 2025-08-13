// frontend/src/pages/PatternExplorerDemo.tsx
// Demo page showcasing the NMJL 2025 pattern search and exploration capabilities

import React, { useState } from 'react';
import { PatternExplorer, PatternDetailView } from '../components/PatternExplorer';
import type { PatternSearchResult } from '../utils/pattern-search-engine';
import type { NMJL2025Pattern } from '../types/nmjl-2025-types';

const PatternExplorerDemo: React.FC = () => {
  const [selectedPattern, setSelectedPattern] = useState<NMJL2025Pattern | null>(null);
  const [showExplorer, setShowExplorer] = useState(true);

  const handlePatternSelect = (result: PatternSearchResult) => {
    setSelectedPattern(result.pattern);
    setShowExplorer(false);
  };

  const handleCloseDetail = () => {
    setSelectedPattern(null);
    setShowExplorer(true);
  };

  const handleSimilarPatternClick = (pattern: NMJL2025Pattern) => {
    setSelectedPattern(pattern);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-6">
        {/* Navigation */}
        <div className="mb-6">
          <nav className="flex items-center space-x-4 text-sm">
            <button
              onClick={() => setShowExplorer(true)}
              className={`px-3 py-2 rounded ${
                showExplorer 
                  ? 'bg-blue-100 text-blue-700 font-medium' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Pattern Explorer
            </button>
            {selectedPattern && (
              <>
                <span className="text-gray-400">→</span>
                <button
                  onClick={() => setShowExplorer(false)}
                  className={`px-3 py-2 rounded ${
                    !showExplorer 
                      ? 'bg-blue-100 text-blue-700 font-medium' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Pattern #{selectedPattern["Pattern ID"]}
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Content */}
        {showExplorer ? (
          <PatternExplorer 
            onPatternSelect={handlePatternSelect}
            showStats={true}
          />
        ) : selectedPattern ? (
          <PatternDetailView
            pattern={selectedPattern}
            onClose={handleCloseDetail}
            onSimilarPatternClick={handleSimilarPatternClick}
          />
        ) : null}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-gray-500 text-sm">
          <p>
            NMJL 2025 Pattern Explorer - Powered by authentic National Mah Jongg League card data
          </p>
          <p className="mt-1">
            Explore all 71 official patterns with advanced search and filtering capabilities
          </p>
        </div>
      </div>
    </div>
  );
};

export default PatternExplorerDemo;