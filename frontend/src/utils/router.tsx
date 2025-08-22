import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../ui-components/layout/AppLayout'
import { LandingPage } from '../features/landing/LandingPage'
import { PatternSelectionPage } from '../features/pattern-selection'
import { TileInputPage } from '../features/tile-input'
import { IntelligencePanelPage } from '../features/intelligence-panel'
import { CharlestonView } from '../features/charleston'
import { TutorialView } from '../features/tutorial'
import { GameModeView } from '../features/gameplay'
import { RoomSetupView } from '../features/room-setup/RoomSetupView'
import { PostGameView } from '../features/post-game/PostGameView'
import { RouteGuard } from './RouteGuard'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout><LandingPage /></AppLayout>,
  },
  {
    path: '/tutorial',
    element: <AppLayout><TutorialView initialSection="welcome" onComplete={() => console.log('Tutorial completed!')} /></AppLayout>,
  },
  {
    path: '/patterns',
    element: <AppLayout><PatternSelectionPage /></AppLayout>,
  },
  {
    path: '/pattern-selection',
    element: <AppLayout><PatternSelectionPage /></AppLayout>,
  },
  {
    path: '/tiles',
    element: <AppLayout><TileInputPage /></AppLayout>,
  },
  {
    path: '/intelligence',
    element: <AppLayout><IntelligencePanelPage /></AppLayout>,
  },
  {
    path: '/charleston',
    element: <AppLayout><RouteGuard requiresRoomSetup><CharlestonView /></RouteGuard></AppLayout>,
  },
  {
    path: '/game',
    element: <AppLayout><RouteGuard requiresGameStart><GameModeView /></RouteGuard></AppLayout>,
  },
  {
    path: '/room-setup',
    element: <AppLayout><RoomSetupView /></AppLayout>,
  },
  {
    path: '/post-game',
    element: <AppLayout><PostGameView /></AppLayout>,
  },
])