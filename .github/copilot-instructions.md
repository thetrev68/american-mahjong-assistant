# AI Coding Agent Instructions for `american-mahjong-assistant`

## Overview
This repository is a production-ready MVP for an intelligent co-pilot assisting American Mahjong players. It features a multi-engine AI system, a responsive frontend, and a robust backend. The architecture follows a feature-sliced approach, ensuring modularity and scalability.

## Key Components
- **Frontend**: React 18, TypeScript, Zustand, Tailwind CSS, Vite
- **Backend**: Express, Socket.io, TypeScript
- **AI System**: Three engines (Analysis → Ranking → Recommendations)
- **Data**: NMJL 2025 patterns with 1,002 variations
- **Testing**: Vitest + React Testing Library

## Architecture Highlights
- **Feature-Sliced Architecture**: Services and state management are co-located with features for better modularity.
- **Mobile-First Design**: The UI is optimized for touch devices and responsive layouts.
- **AI Co-Pilot**: The AI suggests actions but never automates gameplay, ensuring user control.

## Development Standards
- **TypeScript Strict Mode**: No `any` types without justification.
- **ESLint**: Zero errors and warnings before commits.
- **Testing**: All new features must include tests.
- **File Organization**:
  - Co-locate tests in `__tests__/` folders.
  - Avoid modifying files in the `legacy/` directory.

## Critical Workflows
### Build and Run
- Install dependencies: `npm install`
- Start the development servers: `npm run dev:backend` and `npm run dev:frontend`


### Testing
- Run all tests: `npm test`
- Run frontend tests: `npm run test:frontend`
- Run backend tests: `npm run test:backend`

### Linting
- Check linting: `npm run lint`
- Fix linting issues: `npm run lint:fix`

## Integration Points
- **Frontend-Backend Communication**: Socket.io is used for real-time updates.
- **AI System**: Located in `packages/frontend/src/features/intelligence-panel/services/`.
- **Data**: NMJL patterns are stored in `packages/frontend/public/intelligence/nmjl-patterns/`.

## Project-Specific Conventions
- **State Management**: Use Zustand with feature-based stores.
- **Styling**: Tailwind CSS with a purple/blue palette and glassmorphism effects.
- **Code Comments**: Avoid comments unless explicitly requested.

## Example Patterns
### Zustand Store Example
```typescript
import { create } from 'zustand';

const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

export default useStore;
```

### AI Service Example
Located in `packages/frontend/src/lib/services/analysis-engine.ts`:
```typescript
export const analyzeGame = (gameState) => {
  // AI analysis logic here
};
```

## Notes for AI Agents
- Always follow the feature-sliced architecture.
- Ensure mobile responsiveness in all UI changes.
- Validate changes with tests and linting before commits.
- Avoid creating new documentation files unless explicitly requested.

For further details, refer to the `README.md` and `CLAUDE.md` files.