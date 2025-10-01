# GEMINI.md: American Mahjong Intelligent Co-Pilot

## Project Overview

This is a full-stack TypeScript project that provides an "intelligent co-pilot" for American Mahjong. The application is designed to run on a local network, allowing multiple players to connect from their own devices. It features a sophisticated "3-Engine AI System" that analyzes a player's hand and provides real-time strategic recommendations.

The project is structured as a monorepo with packages for `frontend`, `backend`, `shared-types`, and `shared-utils`.

### Key Technologies

*   **Frontend:**
    *   **Framework:** React 18
    *   **Build Tool:** Vite
    *   **Language:** TypeScript
    *   **Styling:** Tailwind CSS
    *   **State Management:** Zustand
    *   **Testing:** Vitest

*   **Backend:**
    *   **Framework:** Node.js with Express
    *   **Language:** TypeScript
    *   **Real-time Communication:** Socket.IO
    *   **Testing:** Vitest

*   **Shared:**
    *   `shared-types`: Contains TypeScript types used across the monorepo.
    *   `shared-utils`: Contains utility functions used across the monorepo.

### Architecture

The core intelligence of the application resides in the frontend, within a "3-Engine AI System":

1.  **PatternAnalysisEngine:** Analyzes the player's hand to determine which tiles match which patterns.
2.  **PatternRankingEngine:** Scores and ranks the possible patterns based on the player's hand and the game state.
3.  **TileRecommendationEngine:** Provides recommendations on which tiles to keep, pass, or discard.

The backend is primarily responsible for multiplayer functionality, managing game rooms, player state, and real-time communication using Socket.IO.

## Building and Running

### Prerequisites

*   Node.js 18+

### Installation

1.  **Install root dependencies:**
    ```bash
    npm install
    ```
2.  **Install dependencies for all packages:**
    ```bash
    npm install --workspaces
    ```

### Running the Application

*   **Frontend:**
    ```bash
    npm run dev:frontend
    ```
    The frontend will be available at `http://localhost:5173`.

*   **Backend:**
    ```bash
    npm run dev:backend
    ```
    The backend server will start on port 5000.

## Development Conventions

*   **Code Style:** The project uses ESLint to enforce a consistent code style. Run `npm run lint --workspaces` to check for linting errors in all packages.
*   **Testing:**
    *   Frontend tests are written with Vitest. Run `npm test --workspace=frontend` to run the tests.
    *   Backend tests are written with Vitest. Run `npm test --workspace=backend` to run the tests.
*   **Commits:** Commit messages should be clear and descriptive.
