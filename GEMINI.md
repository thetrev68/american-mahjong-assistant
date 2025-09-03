# GEMINI.md: American Mahjong Intelligent Co-Pilot

## Project Overview

This is a full-stack TypeScript project that provides an "intelligent co-pilot" for American Mahjong. The application is designed to run on a local network, allowing multiple players to connect from their own devices. It features a sophisticated "3-Engine AI System" that analyzes a player's hand and provides real-time strategic recommendations.

The project is structured as a monorepo with a `frontend`, `backend`, and `shared` directory.

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
    *   **Testing:** Jest

*   **Shared:**
    *   Contains TypeScript types and utility functions used by both the frontend and backend.

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
2.  **Install frontend dependencies:**
    ```bash
    cd frontend
    npm install
    ```
3.  **Install backend dependencies:**
    ```bash
    cd backend
    npm install
    ```

### Running the Application

*   **Frontend:**
    ```bash
    cd frontend
    npm run dev
    ```
    The frontend will be available at `http://localhost:5173`.

*   **Backend:**
    ```bash
    cd backend
    npm run dev
    ```
    The backend server will start on port 5000.

## Development Conventions

*   **Code Style:** The project uses ESLint to enforce a consistent code style. Run `npm run lint` in the root, `frontend`, and `backend` directories to check for linting errors.
*   **Testing:**
    *   Frontend tests are written with Vitest. Run `npm test` in the `frontend` directory to run the tests.
    *   Backend tests are written with Jest. Run `npm test` in the `backend` directory to run the tests.
*   **Commits:** Commit messages should be clear and descriptive.
