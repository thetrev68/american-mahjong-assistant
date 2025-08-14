import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../ui-components/Button'
import { Card } from '../../ui-components/Card'
import { Container } from '../../ui-components/layout/Container'
// import { useUIStore } from '../../stores'

export const LandingPage = () => {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null)
  // const { setTutorialCompleted } = useUIStore()
  const navigate = useNavigate()
  
  const features = [
    {
      id: 'pattern-selection',
      icon: '🎯',
      title: 'Smart Pattern Selection',
      description: 'Choose from 71 authentic NMJL 2025 patterns with AI-powered recommendations',
      demo: 'Try selecting "#23: LIKE NUMBERS" and see instant progress tracking'
    },
    {
      id: 'tile-intelligence',
      icon: '🧠',
      title: 'Intelligent Tile Analysis', 
      description: 'Get real-time advice on which tiles to keep, pass, or discard',
      demo: 'Tap any tile to see detailed analysis and pattern impact'
    },
    {
      id: 'charleston-ai',
      icon: '🔄',
      title: 'Charleston Co-Pilot',
      description: 'Strategic passing recommendations focused on your target pattern',
      demo: 'Never pass jokers again - AI prevents costly mistakes'
    },
    {
      id: 'multiplayer',
      icon: '👥',
      title: 'Local Multiplayer',
      description: 'Play with friends using physical tiles and digital intelligence',
      demo: 'Everyone gets their own co-pilot or use solo mode for yourself only'
    }
  ]
  
  return (
    <Container size="xl" padding="lg" center>
      <div className="text-center space-y-8">
        {/* Hero Section */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-primary/10 to-secondary/10 px-6 py-3 rounded-full">
            <span className="text-3xl">🀄</span>
            <span className="text-lg font-semibold text-primary">Powered by AI</span>
          </div>
          
          <h1 className="text-5xl font-black text-gray-900 tracking-tight">
            Your Intelligent
            <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Mahjong Co-Pilot
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Master American Mahjong with AI-powered pattern analysis, strategic recommendations, 
            and real-time intelligence while playing with physical tiles.
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            variant="primary" 
            size="lg"
            onClick={() => navigate('/tiles')}
            icon="🚀"
          >
            Start Playing
          </Button>
          
          <Button 
            variant="secondary" 
            size="lg"
            onClick={() => navigate('/tiles')}
            icon="🧠"
          >
            AI Intelligence
          </Button>
          
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => setSelectedFeature('demo')}
          >
            View Demo
          </Button>
        </div>
        
        {/* Feature Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
          {features.map((feature) => (
            <Card
              key={feature.id}
              variant="elevated"
              interactive
              onClick={() => setSelectedFeature(feature.id)}
              className={`transition-all duration-300 ${
                selectedFeature === feature.id 
                  ? 'ring-4 ring-primary/20 shadow-xl' 
                  : ''
              }`}
            >
              <div className="text-center space-y-4">
                <div className="text-4xl">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                
                {selectedFeature === feature.id && (
                  <div className="pt-4 border-t border-gray-100 animate-pop-in">
                    <div className="bg-primary/5 rounded-lg p-3 space-y-3">
                      <p className="text-sm text-primary font-medium">
                        💡 {feature.demo}
                      </p>
                      {/* Add Try It buttons for available features */}
                      {(feature.id === 'pattern-selection' || 
                        feature.id === 'tile-intelligence' ||
                        feature.id === 'charleston-ai') && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (feature.id === 'pattern-selection') navigate('/pattern-selection')
                            if (feature.id === 'tile-intelligence') navigate('/intelligence')
                            if (feature.id === 'charleston-ai') navigate('/charleston')
                          }}
                        >
                          Try It Now
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
        
        {/* Status Display */}
        <div className="mt-16 p-6 bg-surface rounded-2xl border border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <h4 className="font-semibold text-gray-900">Development Status</h4>
              <p className="text-sm text-gray-600">
                Charleston Intelligence • Pattern analysis • Layer Cake UI online
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-accent rounded-full animate-pulse" />
              <span className="text-sm font-medium text-accent">
                CHUNK 5 Complete
              </span>
            </div>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="space-y-2">
            <div className="metric-number">71</div>
            <div className="caption-text">NMJL 2025 Patterns</div>
          </div>
          <div className="space-y-2">
            <div className="metric-number">AI</div>
            <div className="caption-text">Powered Intelligence</div>
          </div>
          <div className="space-y-2">
            <div className="metric-number">∞</div>
            <div className="caption-text">Learning Opportunities</div>
          </div>
        </div>
      </div>
    </Container>
  )
}