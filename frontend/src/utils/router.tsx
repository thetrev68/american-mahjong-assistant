import { createBrowserRouter } from 'react-router-dom'
import { LandingPage } from '../features/landing/LandingPage'
import { PatternSelectionPage } from '../features/pattern-selection'
import { TileInputPage } from '../features/tile-input'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/tutorial',
    element: <div className="p-8 text-center">Tutorial coming in Chunk 9!</div>,
  },
  {
    path: '/pattern-selection',
    element: <PatternSelectionPage />,
  },
  {
    path: '/tile-input',
    element: <TileInputPage />,
  },
  {
    path: '/game',
    element: <div className="p-8 text-center">Game Interface coming in Chunk 4!</div>,
  },
])