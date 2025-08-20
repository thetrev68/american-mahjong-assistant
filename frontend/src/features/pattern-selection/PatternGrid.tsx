// Pattern Grid Layout Component
// Responsive grid displaying filtered pattern cards

import { useState, useMemo, useEffect } from 'react'
import { PatternCard } from './PatternCard'
import { PatternAnalysisModal } from './PatternAnalysisModal'
import { LoadingSpinner } from '../../ui-components/LoadingSpinner'
import { Button } from '../../ui-components/Button'
import { usePatternStore, useTileStore } from '../../stores'
import { AnalysisEngine } from '../../services/analysis-engine'
import type { HandAnalysis, PatternRecommendation } from '../../stores/intelligence-store'
// Removed dependency on deleted pattern-intelligence-service

export const PatternGrid = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<PatternRecommendation | null>(null)
  
  const {
    isLoading,
    error,
    selectedPatternId,
    targetPatterns,
    patternProgress,
    selectPattern,
    addTargetPattern,
    removeTargetPattern,
    getFilteredPatterns
  } = usePatternStore()
  
  const { playerHand } = useTileStore()
  const filteredPatterns = getFilteredPatterns()
  
  // Calculate pattern analysis using existing analysis engine
  const [patternAnalysis, setPatternAnalysis] = useState<HandAnalysis | null>(null)
  
  useEffect(() => {
    if (!playerHand.length || !filteredPatterns.length || playerHand.length < 3) {
      setPatternAnalysis(null)
      return
    }
    
    const analyzePatterns = async () => {
      try {
        const analysis = await AnalysisEngine.analyzeHand(playerHand, filteredPatterns)
        setPatternAnalysis(analysis)
      } catch (error) {
        console.warn('Failed to calculate pattern analysis:', error)
        setPatternAnalysis(null)
      }
    }
    
    analyzePatterns()
  }, [playerHand, filteredPatterns])
  
  // Convert analysis to map for easy lookup
  const intelligenceScores = useMemo(() => {
    const scoreMap = new Map<string, PatternRecommendation>()
    
    if (patternAnalysis && patternAnalysis.recommendedPatterns) {
      patternAnalysis.recommendedPatterns.forEach(pattern => {
        scoreMap.set(pattern.pattern.id, pattern)
      })
    }
    
    return scoreMap
  }, [patternAnalysis])
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600">Loading NMJL 2025 patterns...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto space-y-4">
          <span className="text-6xl">⚠️</span>
          <h3 className="text-xl font-semibold text-gray-900">
            Failed to Load Patterns
          </h3>
          <p className="text-gray-600">{error}</p>
          <Button
            variant="primary"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }
  
  if (filteredPatterns.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto space-y-4">
          <span className="text-6xl">🔍</span>
          <h3 className="text-xl font-semibold text-gray-900">
            No Patterns Found
          </h3>
          <p className="text-gray-600">
            Try adjusting your search or filter criteria to find patterns.
          </p>
        </div>
      </div>
    )
  }
  
  const handleToggleTarget = (patternId: string) => {
    if (targetPatterns.includes(patternId)) {
      removeTargetPattern(patternId)
    } else {
      addTargetPattern(patternId)
    }
  }
  
  const handleAnalyze = (patternId: string) => {
    const analysis = intelligenceScores.get(patternId)
    if (analysis) {
      // Use PatternRecommendation directly - no conversion needed
      setSelectedAnalysis(analysis)
      setAnalysisModalOpen(true)
    }
  }
  
  const handleCloseModal = () => {
    setAnalysisModalOpen(false)
    setSelectedAnalysis(null)
  }
  
  return (
    <div className="space-y-6">
      {/* View Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {filteredPatterns.length} pattern{filteredPatterns.length === 1 ? '' : 's'}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <span className="text-lg">⊞</span>
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <span className="text-lg">☰</span>
          </Button>
        </div>
      </div>
      
      {/* Pattern Grid/List */}
      <div className={
        viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
      }>
        {filteredPatterns.map(pattern => (
          <PatternCard
            key={pattern.id}
            pattern={pattern}
            isSelected={selectedPatternId === pattern.id}
            isTarget={targetPatterns.includes(pattern.id)}
            progress={patternProgress[pattern.id]}
            intelligenceScore={intelligenceScores.get(pattern.id)}
            onSelect={selectPattern}
            onToggleTarget={handleToggleTarget}
            onAnalyze={playerHand.length > 0 ? handleAnalyze : undefined}
          />
        ))}
      </div>
      
      {/* Bottom Spacing */}
      <div className="h-16" />
      
      {/* Analysis Modal */}
      <PatternAnalysisModal
        isOpen={analysisModalOpen}
        onClose={handleCloseModal}
        analysis={selectedAnalysis}
      />
    </div>
  )
}