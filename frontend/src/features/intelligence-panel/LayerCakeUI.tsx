// Layer Cake UI - Progressive Disclosure Intelligence Interface
// 3-layer architecture: Always Visible → Expandable → Advanced Stats

import { useState } from 'react'
import { useIntelligenceStore } from '../../stores/intelligence-store'
import { useTileStore } from '../../stores/tile-store'
import { usePatternStore } from '../../stores/pattern-store'
import { AlwaysVisibleLayer } from './AlwaysVisibleLayer'
import { ExpandableLayer } from './ExpandableLayer'
import { AdvancedStatsLayer } from './AdvancedStatsLayer'

interface LayerCakeUIProps {
  className?: string
}

export const LayerCakeUI = ({ className = '' }: LayerCakeUIProps) => {
  const {
    currentLayer,
    layersExpanded,
    animationsEnabled,
    setCurrentLayer,
    toggleLayer,
    expandAllLayers,
    collapseAllLayers,
    currentAnalysis,
    isAnalyzing
  } = useIntelligenceStore()
  
  // Local state for smooth animations
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  const handleLayerToggle = async (layer: 1 | 2 | 3) => {
    if (!animationsEnabled) {
      toggleLayer(layer)
      return
    }
    
    setIsTransitioning(true)
    
    // Smooth transition delay
    await new Promise(resolve => setTimeout(resolve, 100))
    toggleLayer(layer)
    
    setTimeout(() => setIsTransitioning(false), 300)
  }
  
  const handleExpandAll = () => {
    expandAllLayers()
    setCurrentLayer(3)
  }
  
  const handleCollapseAll = () => {
    collapseAllLayers()
    setCurrentLayer(1)
  }
  
  // Loading state
  if (isAnalyzing) {
    return (
      <div className={`intelligence-panel ${className}`}>
        <div className="p-6 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <div className="text-muted font-medium">Analyzing hand...</div>
          <div className="text-xs text-gray-500 mt-1">AI co-pilot is thinking</div>
        </div>
      </div>
    )
  }
  
  // No analysis state
  if (!currentAnalysis) {
    return (
      <div className={`intelligence-panel ${className}`}>
        <div className="p-6 text-center">
          <div className="text-4xl mb-4">🤖</div>
          <div className="text-muted font-medium mb-2">Co-Pilot Ready</div>
          <div className="text-xs text-gray-500 mb-4">
            Ready to analyze your hand and provide recommendations
          </div>
          <button
            onClick={async () => {
              const { playerHand } = useTileStore.getState()
              const { getTargetPatterns } = usePatternStore.getState()
              const targetPatterns = getTargetPatterns()
              const { analyzeHand } = useIntelligenceStore.getState()
              await analyzeHand(playerHand, targetPatterns)
            }}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze My Hand'}
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`intelligence-panel space-y-4 ${className}`}>
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="text-lg font-bold text-primary">🧠 AI Co-Pilot</div>
          <div className="px-2 py-1 bg-accent/10 text-accent text-xs font-semibold rounded-full">
            Score: {currentAnalysis.overallScore}
          </div>
        </div>
        
        {/* Layer Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCollapseAll}
            className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
            disabled={!layersExpanded[2] && !layersExpanded[3]}
          >
            Minimize
          </button>
          <button
            onClick={handleExpandAll}
            className="px-3 py-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            disabled={layersExpanded[2] && layersExpanded[3]}
          >
            Expand All
          </button>
        </div>
      </div>
      
      {/* Layer 1: Always Visible */}
      <div className="transition-all duration-300 ease-out">
        <AlwaysVisibleLayer 
          analysis={currentAnalysis}
          isActive={currentLayer >= 1}
          onExpand={() => handleLayerToggle(2)}
        />
      </div>
      
      {/* Layer 2: Expandable Details */}
      <div className={`
        transition-all duration-300 ease-out overflow-hidden
        ${layersExpanded[2] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
        ${isTransitioning ? 'pointer-events-none' : ''}
      `}>
        <ExpandableLayer
          analysis={currentAnalysis}
          isExpanded={layersExpanded[2]}
          isActive={currentLayer >= 2}
          onToggle={() => handleLayerToggle(2)}
          onExpand={() => handleLayerToggle(3)}
        />
      </div>
      
      {/* Layer 3: Advanced Statistics */}
      <div className={`
        transition-all duration-300 ease-out overflow-hidden
        ${layersExpanded[3] ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
        ${isTransitioning ? 'pointer-events-none' : ''}
      `}>
        <AdvancedStatsLayer
          analysis={currentAnalysis}
          isExpanded={layersExpanded[3]}
          isActive={currentLayer >= 3}
          onToggle={() => handleLayerToggle(3)}
        />
      </div>
      
      {/* Progressive Disclosure Hint */}
      {!layersExpanded[2] && !layersExpanded[3] && (
        <div className="text-center p-2">
          <button
            onClick={() => handleLayerToggle(2)}
            className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 mx-auto"
          >
            <span>View detailed analysis</span>
            <span className="text-xs">↓</span>
          </button>
        </div>
      )}
      
      {/* Layer Indicators */}
      <div className="flex justify-center gap-2 py-2">
        {[1, 2, 3].map(layer => (
          <div
            key={layer}
            className={`
              w-2 h-2 rounded-full transition-all duration-200
              ${currentLayer >= layer ? 'bg-primary' : 'bg-gray-300'}
              ${layersExpanded[layer as 1 | 2 | 3] ? 'scale-125' : 'scale-100'}
            `}
          />
        ))}
      </div>
    </div>
  )
}