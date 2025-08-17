import { createBrowserRouter } from 'react-router-dom'
import { LandingPage } from '../features/landing/LandingPage'
import { PatternSelectionPage } from '../features/pattern-selection'
import { TileInputPage } from '../features/tile-input'
import { IntelligencePanelPage } from '../features/intelligence-panel'
import { CharlestonView } from '../features/charleston'
import { TutorialView } from '../features/tutorial'
import { GameModeView } from '../features/gameplay'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/tutorial',
    element: <TutorialView onComplete={() => console.log('Tutorial completed!')} />,
  },
  {
    path: '/patterns',
    element: <PatternSelectionPage />,
  },
  {
    path: '/pattern-selection',
    element: <PatternSelectionPage />,
  },
  {
    path: '/tiles',
    element: <TileInputPage />,
  },
  {
    path: '/tile-input',
    element: <TileInputPage />,
  },
  {
    path: '/intelligence',
    element: <IntelligencePanelPage />,
  },
  {
    path: '/charleston',
    element: <CharlestonView />,
  },
  {
    path: '/game',
    element: <GameModeView />,
  },
])