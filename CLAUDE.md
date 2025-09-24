# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development (monorepo)
npm run dev:frontend    # Frontend at http://localhost:5175  
npm run dev:backend     # Backend at http://localhost:5000

# Testing (Vitest)
npm test               # All workspaces
npm run test:watch     # Watch mode  
npm run test:coverage  # Coverage reports

# Linting (ESLint)
npm run lint           # Entire monorepo
npm run lint:fix       # Auto-fix issues

# Full setup
npm install            # Install all dependencies
npm run dev:backend    # Start backend (terminal 1)
npm run dev:frontend   # Start frontend (terminal 2)
# Access: http://localhost:5175
```

## Architecture

**American Mahjong Co-Pilot System** - Local multiplayer web app providing intelligent assistance during physical gameplay. Players use phones as co-pilots while playing with real tiles.

### Core Structure
```
packages/
├── frontend/          # React 18 + TypeScript + Vite + Zustand
│   ├── src/features/  # Feature-Sliced Design with co-located services
│   │   ├── charleston/       # Charleston intelligence + services/
│   │   ├── gameplay/         # Game Mode co-pilot + services/
│   │   ├── intelligence-panel/ # AI analysis + services/
│   │   ├── pattern-selection/ # NMJL pattern browsing
│   │   └── tile-input/       # Hand management
│   ├── src/stores/    # Zustand stores (game, pattern, intelligence, tile)
│   ├── src/ui-components/ # Design system (Button, Card, Tile, etc.)
│   └── src/lib/services/  # Shared services (NMJL, tile, network)
├── backend/           # Express + Socket.io + TypeScript
└── shared-types/      # Shared TypeScript definitions
```

### Key Files
- `packages/frontend/src/stores/` - Zustand state management
- `packages/frontend/src/features/gameplay/GameModeView.tsx` - Main co-pilot interface
- `packages/frontend/src/features/intelligence-panel/services/` - 3-engine AI system
- `packages/frontend/src/lib/services/analysis-engine.ts` - AI coordination
- `packages/frontend/public/intelligence/nmjl-patterns/` - NMJL 2025 data
- `packages/frontend/src/utils/RouteGuard.tsx` - Flow protection

## Development Rules

### Code Quality
- **ESLint**: 0 errors, 0 warnings before commits
- **TypeScript**: Strict mode, no `any` without justification  
- **Testing**: All new features need tests
- **Imports**: Remove unused immediately

### Architecture Patterns
- **Co-Pilot**: AI suggests, user decides (never auto-pilot)
- **Feature-Sliced**: Services co-located with features
- **Zustand**: Feature-based stores, not monolithic
- **Mobile-First**: Touch-optimized responsive design
- **No Comments**: Unless explicitly requested

### File Organization
- **NEVER** move files from `legacy/` (contains working systems)
- **PREFER** editing existing files over creating new ones
- **NEVER** create documentation files unless requested
- **Co-locate** tests in `__tests__/` folders

### Workflow
1. Understand existing patterns first
2. Run `npm run lint` before commits  
3. Use TodoWrite tool for progress tracking
4. Test on mobile devices
5. Small, focused commits

## Key Technologies

- **Frontend**: React 18, TypeScript, Vite, Zustand, Tailwind CSS
- **Backend**: Express, Socket.io, TypeScript, Vitest
- **AI**: 3-engine system (Analysis → Ranking → Recommendations)
- **Data**: NMJL 2025 patterns, 1,002 pattern variations
- **Design**: Purple/blue palette, glassmorphism effects
- **Testing**: Vitest + React Testing Library

This is a production-ready MVP with complete game flow and intelligent co-pilot assistance.