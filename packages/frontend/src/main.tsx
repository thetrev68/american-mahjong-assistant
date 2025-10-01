import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { nmjlService } from './lib/services/nmjl-service'
import { PatternVariationLoader } from './features/intelligence-panel/services/pattern-variation-loader'

// Strict Mode disabled due to conflicts with singleton lazy loaders
// React Strict Mode intentionally double-mounts components in development to detect side effects
// However, this breaks our lazy loading singletons (AnalysisEngine, nmjlService) which cache
// async operations at the module level. When Strict Mode unmounts, the async operations are
// abandoned but the promises remain stuck in pending state, blocking subsequent mounts.

// Preload ALL pattern data BEFORE mounting app to avoid network stalls during game
console.log('🎴 Preloading NMJL data...')
Promise.all([
  nmjlService.loadPatterns().then(() => console.log('✅ Main patterns loaded')),
  PatternVariationLoader.loadVariations().then(() => console.log('✅ Pattern variations loaded'))
])
  .then(() => {
    console.log('✅✅✅ All NMJL data preloaded successfully!')
    console.log('🚀 Mounting React app...')
    createRoot(document.getElementById('root')!).render(<App />)
  })
  .catch(err => {
    console.error('❌ Failed to preload NMJL data:', err)
    // Show error UI
    createRoot(document.getElementById('root')!).render(
      <div style={{
        padding: '40px',
        textAlign: 'center',
        fontFamily: 'system-ui',
        color: '#dc2626'
      }}>
        <h2>Failed to load pattern data</h2>
        <p>Please refresh the page to try again.</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Reload Page
        </button>
      </div>
    )
  })
