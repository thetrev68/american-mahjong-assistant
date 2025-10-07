# Architecture Review & Recommendations

This document provides a high-level analysis of the American Mahjong Assistant repository and offers recommendations for simplification and improvement.

## Overall Assessment

The project is built on a solid foundation with a modern tech stack and a well-defined monorepo structure. However, the implementation has become overly complex, deviating significantly from the clean architecture described in the documentation. The primary issues are a bloated and fragmented AI/business logic layer, an overly-granular state management system, and an inefficient data-loading strategy.

This has resulted in a codebase that is difficult to understand, maintain, and extend, which is the core of the problem you're facing.

## Key Findings & Architectural Issues

1.  **AI Engine Proliferation**: The documented "3-Engine AI System" has expanded to over a dozen services spread across `intelligence-panel` and `strategy-advisor` features. This has created a complex and tangled web of dependencies that is hard to reason about.
2.  **Fragmented State Management**: There are over 15 Zustand stores. While feature-based stores are a good practice, this level of granularity is excessive. It leads to a scattered state that is difficult to track and increases the likelihood of synchronization issues.
3.  **Blocking Data Loading**: The application preloads all 1,002 pattern variations before rendering the UI, resulting in a significant startup delay. This is a critical performance bottleneck.
4.  **Architectural Drift**: The implementation no longer reflects the `ARCHITECTURE_OVERVIEW.md` document. This makes it difficult for developers to understand the current state of the system.

## High-Level Recommendations for Simplification

The goal of these recommendations is to reduce complexity, improve performance, and make the codebase easier to work with.

### 1. Consolidate the AI/Intelligence Engines

Instead of a dozen-plus services, refactor the AI logic back into the three core engines as described in the architecture document:

*   **`PatternAnalysisEngine`**: Responsible for the mathematical analysis of a hand against patterns.
*   **`PatternRankingEngine`**: Responsible for scoring and ranking the patterns based on the analysis.
*   **`TileRecommendationEngine`**: Responsible for generating strategic advice based on the ranked patterns.

All other logic from the various services (`call-opportunity-analyzer`, `opponent-analysis-engine`, `turn-intelligence-engine`, `pattern-prioritizer`, etc.) should be consolidated into these three engines. This will dramatically simplify the AI system and make it easier to understand and maintain.

### 2. Unify the Zustand Stores

Consolidate the 15+ Zustand stores into a few, domain-oriented stores. A good starting point would be:

*   **`useGameStore`**: Manages the core game state, including the current hand, discards, and game phase.
*   **`useIntelligenceStore`**: Manages the state related to the AI analysis, including the results from the three engines.
*   **`useRoomStore`**: Manages multiplayer state, including the room, players, and socket connection.
*   **`useUIStore`**: Manages UI-related state, such as modals, notifications, and user preferences.

This will create a more centralized and predictable state management system.

### 3. Implement On-Demand Data Loading

Refactor the data loading strategy to be non-blocking:

1.  **Load Essential Data First**: On startup, load only the essential data required to render the main UI (e.g., the 71 base patterns).
2.  **Load Variations On-Demand**: Load the 1,002 pattern variations in the background *after* the application is interactive. A loading indicator can be shown in the UI.
3.  **Use a Service Worker**: Consider using a service worker to cache the pattern data, which will improve subsequent load times.

This will ensure the application loads quickly and feels responsive.

### 4. Update the Architecture Documentation

After refactoring, update the `ARCHITECTURE_OVERVIEW.md` document to reflect the new, simplified architecture. This is a critical step to ensure the long-term maintainability of the project.

## Proposed Action Plan

1.  **Start with the stores**: Begin by consolidating the Zustand stores. This will likely reveal dependencies and help you to better understand the current state flow.
2.  **Consolidate the AI engines**: Once the state is more manageable, refactor the AI services into the three core engines.
3.  **Implement on-demand data loading**: With the core logic simplified, address the data loading performance bottleneck.
4.  **Update the documentation**: Finally, update the documentation to reflect the changes.

This is a significant undertaking, but it will result in a much cleaner, more efficient, and more maintainable codebase.
