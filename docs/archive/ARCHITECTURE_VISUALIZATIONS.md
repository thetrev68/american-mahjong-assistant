# American Mahjong Assistant - Architecture Visualizations

*Generated on: January 9, 2025*

This file contains Mermaid diagrams showing the architectural relationships in your American Mahjong Assistant codebase. You can view these diagrams by:

- **GitHub**: View this file directly on GitHub (renders automatically)
- **VS Code**: Install "Mermaid Preview" extension and open preview
- **Online**: Copy/paste code blocks into [mermaid.live](https://mermaid.live)

---

## 1. Architecture Overview - High-Level System Flow

```mermaid
graph TB
    %% Main App Entry Point
    App[App.tsx] --> Router[React Router]
    
    %% Feature Modules
    Router --> Landing[Landing Page]
    Router --> PatternSelect[Pattern Selection]
    Router --> TileInput[Tile Input]
    Router --> Charleston[Charleston Phase]
    Router --> GameMode[Game Mode]
    Router --> Tutorial[Tutorial System]
    
    %% Zustand State Management Hub
    subgraph "State Management (Zustand)"
        GameStore[game-store.ts]
        PatternStore[pattern-store.ts]
        TileStore[tile-store.ts]
        IntelligenceStore[intelligence-store.ts]
        RoomStore[room-store.ts]
        CharlestonStore[charleston-store.ts]
        TurnStore[turn-store.ts]
        HistoryStore[history-store.ts]
        MultiplayerStore[multiplayer-store.ts]
    end
    
    %% Intelligence System
    subgraph "3-Engine Intelligence System"
        AnalysisEngine[analysis-engine.ts]
        PatternAnalysisEngine[pattern-analysis-engine.ts]
        PatternRankingEngine[pattern-ranking-engine.ts]
        TileRecommendationEngine[tile-recommendation-engine.ts]
        PatternVariationLoader[pattern-variation-loader.ts]
    end
    
    %% Services Layer
    subgraph "Services"
        NMJLService[nmjl-service.ts]
        TileService[tile-service.ts]
        CallOpportunityAnalyzer[call-opportunity-analyzer.ts]
        GameActions[game-actions.ts]
    end
    
    %% Data Sources
    subgraph "Data Layer"
        NMJLPatterns["nmjl-card-2025.json"]
        PatternVariations["pattern-variations.json"]
    end
    
    %% Backend System
    subgraph "Backend (Optional Multiplayer)"
        SocketHandlers[Socket Handlers]
        RoomManager[Room Manager]
        StateSyncManager[State Sync Manager]
    end
    
    %% Connections
    Landing -.-> GameStore
    Landing -.-> RoomStore
    PatternSelect -.-> PatternStore
    PatternSelect -.-> NMJLService
    TileInput -.-> TileStore
    Charleston -.-> CharlestonStore
    Charleston -.-> TileStore
    GameMode -.-> GameStore
    GameMode -.-> IntelligenceStore
    
    AnalysisEngine --> PatternAnalysisEngine
    AnalysisEngine --> PatternRankingEngine
    AnalysisEngine --> TileRecommendationEngine
    PatternAnalysisEngine --> PatternVariationLoader
    
    NMJLService --> NMJLPatterns
    PatternVariationLoader --> PatternVariations
    
    IntelligenceStore -.-> AnalysisEngine
    
    %% Connection Resilience
    subgraph "Connection Resilience"
        ConnectionResilienceService[connection-resilience.ts]
        EventQueueManager[event-queue-manager.ts]
        CharlestonResilient[charleston-resilient.ts]
    end
```

---

## 2. Store Network - Zustand State Management

```mermaid
graph LR
    %% Central Stores
    GameStore[game-store.ts<br/>Core Game State]
    PatternStore[pattern-store.ts<br/>Pattern Selection]
    TileStore[tile-store.ts<br/>Hand Management]
    IntelligenceStore[intelligence-store.ts<br/>AI Analysis]
    
    %% Supporting Stores
    RoomStore[room-store.ts<br/>Room Setup]
    CharlestonStore[charleston-store.ts<br/>Charleston Phase]
    TurnStore[turn-store.ts<br/>Turn Management]
    HistoryStore[history-store.ts<br/>Game History]
    MultiplayerStore[multiplayer-store.ts<br/>Network State]
    
    %% Components using stores
    subgraph "Feature Components"
        LandingPage[LandingPage.tsx]
        PatternSelection[Pattern Selection]
        TileInputModal[TileInputModal.tsx]
        CharlestonView[CharlestonView.tsx]
        GameModeView[GameModeView.tsx]
        IntelligencePanel[Intelligence Panel]
    end
    
    %% Store connections
    LandingPage -.-> GameStore
    LandingPage -.-> RoomStore
    LandingPage -.-> PatternStore
    LandingPage -.-> TileStore
    LandingPage -.-> IntelligenceStore
    
    PatternSelection -.-> PatternStore
    PatternSelection -.-> IntelligenceStore
    
    TileInputModal -.-> TileStore
    TileInputModal -.-> CharlestonStore
    
    CharlestonView -.-> CharlestonStore
    CharlestonView -.-> TileStore
    CharlestonView -.-> GameStore
    CharlestonView -.-> RoomStore
    CharlestonView -.-> PatternStore
    CharlestonView -.-> IntelligenceStore
    CharlestonView -.-> MultiplayerStore
    
    GameModeView -.-> GameStore
    GameModeView -.-> RoomStore
    GameModeView -.-> PatternStore
    GameModeView -.-> IntelligenceStore
    GameModeView -.-> TileStore
    GameModeView -.-> TurnStore
    
    IntelligencePanel -.-> IntelligenceStore
    IntelligencePanel -.-> PatternStore
    
    %% Inter-store dependencies
    IntelligenceStore -.-> PatternStore
    IntelligenceStore -.-> TileStore
    CharlestonStore -.-> TileStore
    TurnStore -.-> GameStore
    
    %% Persistence
    GameStore -.-> LocalStorage[localStorage<br/>Persistence]
    PatternStore -.-> LocalStorage
    TileStore -.-> LocalStorage
    RoomStore -.-> LocalStorage
```

---

## 3. 3-Engine Intelligence System Flow

```mermaid
flowchart TD
    %% Input
    HandTiles[Player Hand Tiles]
    PatternSelection[Selected Patterns]
    GameContext[Game Context<br/>• Discarded tiles<br/>• Exposed sets<br/>• Turn info]
    
    %% Data Sources
    NMJLPatterns[NMJL Card 2025<br/>71 Official Patterns]
    PatternVariations[Pattern Variations<br/>1,002 Tile Combinations]
    
    %% Engine 1: Pattern Analysis
    subgraph Engine1 [Engine 1: Pattern Analysis]
        PatternAnalysisEngine[PatternAnalysisEngine.ts<br/>Mathematical Facts]
        PatternLoader[PatternVariationLoader.ts<br/>High-Performance Caching]
        TileMatching[Tile Matching Logic<br/>Exact Pattern Validation]
    end
    
    %% Engine 2: Pattern Ranking  
    subgraph Engine2 [Engine 2: Pattern Ranking]
        PatternRankingEngine[PatternRankingEngine.ts<br/>Strategic Scoring]
        ScoringComponents[4-Component Scoring<br/>• Base: 0-40 pts<br/>• Context: 0-30 pts<br/>• Strategy: 0-20 pts<br/>• Meta: 0-10 pts]
    end
    
    %% Engine 3: Tile Recommendations
    subgraph Engine3 [Engine 3: Tile Recommendations]
        TileRecommendationEngine[TileRecommendationEngine.ts<br/>Action Recommendations]
        OpponentAnalysis[Opponent Analysis<br/>Block/Benefit Logic]
        KeepPassDiscard[Keep/Pass/Discard<br/>Strategic Decisions]
    end
    
    %% Cache Layer
    subgraph Cache [Performance Cache]
        Engine1Cache[Engine 1 Cache<br/>Pattern Facts]
        PatternCache[Pattern Variation Cache<br/>678KB Optimized JSON]
    end
    
    %% Analysis Coordinator
    AnalysisEngine[analysis-engine.ts<br/>Main Coordinator<br/>Sub-300ms Performance]
    
    %% Output
    HandAnalysis[Hand Analysis Results<br/>• Pattern viability<br/>• Completion %<br/>• AI scores]
    PatternRecommendations[Pattern Recommendations<br/>• Primary pattern<br/>• Alternative options<br/>• Switch suggestions]
    TileRecommendations[Tile Recommendations<br/>• Keep these tiles<br/>• Pass these tiles<br/>• Discard priorities]
    
    %% Flow connections
    HandTiles --> AnalysisEngine
    PatternSelection --> AnalysisEngine
    GameContext --> AnalysisEngine
    
    NMJLPatterns --> PatternLoader
    PatternVariations --> PatternLoader
    
    AnalysisEngine --> Engine1
    PatternLoader --> Engine1
    Engine1Cache --> PatternAnalysisEngine
    
    Engine1 --> Engine2
    Engine2 --> Engine3
    
    Engine1 --> Engine1Cache
    PatternLoader --> PatternCache
    
    Engine1 --> HandAnalysis
    Engine2 --> PatternRecommendations
    Engine3 --> TileRecommendations
    
    %% Intelligence Store Integration
    AnalysisEngine --> IntelligenceStore[intelligence-store.ts<br/>UI State Management]
    IntelligenceStore --> UI[Game UI Components]
```

---

## 4. Feature Dependencies Map

```mermaid
graph TB
    %% Shared Resources Hub
    subgraph Shared [Shared Resources]
        NMJLTypes[nmjl-types.ts<br/>Type Definitions]
        GameTypes[game-types.ts<br/>Core Game Types]
        TileUtils[tile-utils.ts<br/>Tile Utilities]
        SocketEvents[socket-events.ts<br/>Network Events]
    end
    
    %% UI Components Library
    subgraph UIComponents [UI Components]
        Button[Button.tsx]
        Card[Card.tsx]
        AnimatedTile[AnimatedTile.tsx]
        TileSprite[TileSprite.tsx]
        LoadingSpinner[LoadingSpinner.tsx]
        Layout[Layout Components]
    end
    
    %% Features
    subgraph Features [Feature Modules]
        Landing[landing/<br/>Hello Co-Pilot]
        PatternSelection[pattern-selection/<br/>NMJL Pattern Browser]
        TileInput[tile-input/<br/>Hand Management]
        Charleston[charleston/<br/>Charleston Intelligence]
        Gameplay[gameplay/<br/>Game Mode Co-Pilot]
        Tutorial[tutorial/<br/>Onboarding System]
        IntelligencePanel[intelligence-panel/<br/>AI Analysis UI]
        PostGame[post-game/<br/>Game Analysis]
    end
    
    %% Services Layer
    subgraph Services [Core Services]
        NMJLService[nmjl-service.ts]
        AnalysisEngine[analysis-engine.ts]
        TileService[tile-service.ts]
        CallOpportunityAnalyzer[call-opportunity-analyzer.ts]
        GameActions[game-actions.ts]
        TurnIntelligence[turn-intelligence-engine.ts]
    end
    
    %% Custom Hooks
    subgraph Hooks [Custom Hooks]
        UseSocket[useSocket.ts]
        UseRoomSetup[useRoomSetup.ts]
        UseCoPilotMode[useCoPilotMode.ts]
        UseConnectionResilience[useConnectionResilience.ts]
        UseTutorial[useTutorial.ts]
        UseAnimations[useAnimations.ts]
        UseHapticFeedback[useHapticFeedback.ts]
        UsePerformance[usePerformance.ts]
    end
    
    %% Dependencies
    Features --> UIComponents
    Features --> Services
    Features --> Hooks
    Features --> Shared
    
    Services --> Shared
    UIComponents --> Shared
    Hooks --> Shared
    
    %% Specific high-dependency connections
    Charleston -.-> TileInput
    Gameplay -.-> IntelligencePanel
    Gameplay -.-> Charleston
    Tutorial -.-> PatternSelection
    Tutorial -.-> TileInput
    
    %% Service dependencies
    AnalysisEngine -.-> NMJLService
    CallOpportunityAnalyzer -.-> AnalysisEngine
    TurnIntelligence -.-> AnalysisEngine
    GameActions -.-> TileService
    
    %% Hook dependencies
    UseRoomSetup -.-> UseSocket
    UseConnectionResilience -.-> UseSocket
    UseCoPilotMode -.-> UseRoomSetup
```

---

## 5. Component Hierarchy & Data Flow

```mermaid
graph TD
    %% App Root
    App[App.tsx<br/>Root Component]
    Router[React Router<br/>Route Management]
    
    %% Route Guards
    RouteGuard[RouteGuard.tsx<br/>Flow Protection]
    
    %% Main Views
    subgraph Views [Main Application Views]
        LandingPage[LandingPage.tsx<br/>Entry Point]
        RoomSetup[RoomSetup/<br/>Solo/Multiplayer]
        PatternSelectionView[PatternSelection/<br/>NMJL Browser]
        TileInputView[TileInput/<br/>Hand Builder]
        CharlestonView[CharlestonView.tsx<br/>Charleston Phase]
        GameModeView[GameModeView.tsx<br/>Main Gameplay]
        TutorialView[TutorialView.tsx<br/>Onboarding]
    end
    
    %% Shared Components
    subgraph SharedComponents [Shared UI Components]
        TileInputModal[TileInputModal.tsx]
        CallOpportunityModal[CallOpportunityModal.tsx]
        GameActionsPanel[GameActionsPanel.tsx]
        IntelligencePanelComponents[Intelligence Panel Components]
    end
    
    %% Layout Components
    subgraph Layout [Layout & Structure]
        Container[Container.tsx]
        Header[Header Components]
        Navigation[Navigation Components]
    end
    
    %% Tile System
    subgraph TileSystem [Tile Rendering System]
        AnimatedTile[AnimatedTile.tsx<br/>Context-aware animations]
        TileSprite[TileSprite.tsx<br/>Base rendering]
        HandDisplay[Hand Display Components]
        DiscardPile[DiscardPile.tsx]
    end
    
    %% Data Flow
    App --> Router
    Router --> RouteGuard
    RouteGuard --> Views
    
    Views --> SharedComponents
    Views --> Layout
    Views --> TileSystem
    
    %% Specific component relationships
    GameModeView --> CallOpportunityModal
    GameModeView --> GameActionsPanel
    GameModeView --> IntelligencePanelComponents
    GameModeView --> DiscardPile
    
    CharlestonView --> TileInputModal
    TileInputView --> TileInputModal
    
    %% Store connections (dotted lines)
    Views -.-> Stores[Zustand Stores]
    SharedComponents -.-> Stores
    TileSystem -.-> Stores
    
    %% Service connections
    Views -.-> Services[Core Services]
    SharedComponents -.-> Services
```

---

## Key Architectural Insights

### **1. Co-Pilot Pattern**
- **Central Intelligence Hub**: `intelligence-store.ts` coordinates AI analysis across all features
- **User Agency**: AI provides suggestions, users make all decisions
- **Real-time Updates**: Analysis triggers on every tile transaction

### **2. State Management Strategy**
- **Feature-based Stores**: Each major feature has dedicated Zustand store
- **Cross-store Dependencies**: Stores coordinate through selectors and actions
- **Persistence**: Critical state persisted to localStorage with rehydration

### **3. 3-Engine Intelligence System**
- **Pipeline Architecture**: Facts → Ranking → Recommendations
- **Performance Optimized**: Sub-300ms analysis with intelligent caching
- **Real Data Integration**: 1,002 pattern variations for exact matching

### **4. Component Architecture**
- **Feature Folders**: Complete feature isolation with co-located components/stores
- **Shared UI Library**: Reusable components with consistent design system
- **Route Protection**: RouteGuard ensures proper game flow progression

### **5. Connection Resilience**
- **Event Queuing**: Operations queued during disconnection, replayed on reconnect
- **Service Coordination**: Unified multiplayer service manager
- **Graceful Degradation**: Solo mode works offline, multiplayer handles network issues

---

## How to View These Diagrams

### **GitHub/GitLab** ✅
- View this file directly in your repository
- Mermaid renders automatically in markdown files

### **VS Code** ✅
1. Install "Mermaid Preview" extension
2. Open this file in VS Code
3. Right-click → "Open Preview" or use Ctrl+Shift+V

### **Online Viewers** ✅
- [Mermaid Live Editor](https://mermaid.live) - Copy/paste any diagram
- [GitHub Gist](https://gist.github.com) - Create a `.md` gist

### **Documentation Sites** ✅
- GitBook, Notion, Obsidian all support Mermaid
- Most modern markdown processors include Mermaid support

---

*These diagrams show how the American Mahjong Assistant follows a modern, scalable architecture with clear separation of concerns, intelligent caching, and robust error handling - all designed to provide a seamless co-pilot experience for in-person mahjong games.*