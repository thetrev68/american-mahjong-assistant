import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../ui-components/layout/AppLayout'
import { LandingPage } from '../features/landing/LandingPage'
import { PatternSelectionPage } from '../features/pattern-selection'
import { TileInputPage } from '../features/tile-input'
import { TutorialView } from '../features/tutorial'
import { GameModeView } from '../features/gameplay'
import { RoomSetupView } from '../features/room-setup/RoomSetupView'
import { PostGameView } from '../features/post-game/PostGameView'
import { RouteGuard } from './RouteGuard'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout key="landing"><LandingPage /></AppLayout>,
  },
  {
    path: '/tutorial',
    element: <AppLayout key="tutorial"><TutorialView initialSection="welcome" onComplete={() => {/* Tutorial completed */}} /></AppLayout>,
  },
  {
    path: '/patterns',
    element: <AppLayout key="patterns"><PatternSelectionPage /></AppLayout>,
  },
  {
    path: '/pattern-selection',
    element: <AppLayout key="pattern-selection"><PatternSelectionPage /></AppLayout>,
  },
  {
    path: '/tiles',
    element: <AppLayout><TileInputPage /></AppLayout>,
  },
  {
    path: '/game',
    element: <AppLayout><RouteGuard requiresGameStart><GameModeView /></RouteGuard></AppLayout>,
  },
  {
    path: '/room-setup',
    element: <AppLayout key="room-setup"><RoomSetupView /></AppLayout>,
  },
  {
    path: '/post-game',
    element: <AppLayout key="post-game"><PostGameView /></AppLayout>,
  },
])