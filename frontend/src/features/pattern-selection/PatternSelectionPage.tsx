// Pattern Selection Page
// Main interface for browsing and selecting NMJL patterns

import { useEffect } from 'react'
import { Container } from '../../ui-components/layout/Container'
import { Button } from '../../ui-components/Button'
import { PatternFilters } from './PatternFilters'
import { PatternGrid } from './PatternGrid'
import { SelectedPatternsPanel } from './SelectedPatternsPanel'
import { usePatternStore } from '../../stores'

export const PatternSelectionPage = () => {
  const {
    loadPatterns,
    targetPatterns,
    getSelectedPattern
  } = usePatternStore()
  
  const selectedPattern = getSelectedPattern()
  
  useEffect(() => {
    loadPatterns()
  }, [loadPatterns])
  
  return (
    <Container size="full" padding="lg">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-primary/10 to-secondary/10 px-6 py-3 rounded-full">
            <span className="text-3xl">🎯</span>
            <span className="text-lg font-semibold text-primary">Pattern Selection</span>
          </div>
          
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Choose Your
            <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Target Patterns
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Browse all 71 authentic NMJL 2025 patterns. Select your primary target and star additional patterns to consider.
          </p>
        </div>
        
        {/* Layout: Filters + Grid + Selection Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search and Filters */}
            <div className="bg-surface rounded-2xl p-6 border border-gray-200">
              <PatternFilters />
            </div>
            
            {/* Pattern Grid */}
            <PatternGrid />
          </div>
          
          {/* Sticky Selection Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <SelectedPatternsPanel />
              
              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={!selectedPattern}
                >
                  Continue with {selectedPattern?.displayName || 'Selection'}
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  Save Pattern List
                </Button>
              </div>
              
              {/* Stats */}
              <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {selectedPattern ? '1' : '0'}
                    </div>
                    <div className="text-xs text-gray-600">Primary</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-secondary">
                      {targetPatterns.length}
                    </div>
                    <div className="text-xs text-gray-600">Targets</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}