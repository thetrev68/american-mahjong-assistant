import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { nmjlService } from './lib/services/nmjl-service'

// Strict Mode disabled due to conflicts with singleton lazy loaders
// React Strict Mode intentionally double-mounts components in development to detect side effects
// However, this breaks our lazy loading singletons (AnalysisEngine, nmjlService) which cache
// async operations at the module level. When Strict Mode unmounts, the async operations are
// abandoned but the promises remain stuck in pending state, blocking subsequent mounts.

// Preload patterns early to avoid network stalls during game
console.log('🎴 Preloading NMJL patterns...')
nmjlService.loadPatterns().then(() => {
  console.log('✅ Patterns preloaded successfully')
}).catch(err => {
  console.error('❌ Failed to preload patterns:', err)
})

createRoot(document.getElementById('root')!).render(<App />)
