# 🏗️ Architecture Overview
**American Mahjong Assistant - System Design & Technical Architecture**

This document provides a comprehensive overview of the American Mahjong Assistant's architecture, design decisions, and technical implementation.

---

## 🎯 System Overview

### **Mission Statement**
Create an intelligent co-pilot system that provides real-time AI assistance during in-person American Mahjong games while preserving the social, physical gameplay experience.

### **Core Principles**
- **Co-Pilot, Not Auto-Pilot**: AI provides suggestions, users make decisions
- **Privacy First**: Player hands and strategies remain private
- **Real-World Integration**: Designed for physical tile games with digital overlay
- **Mobile-First**: Touch-optimized for discrete phone usage during games
- **Performance Focused**: Sub-3-second load times, instant AI recommendations

---

## 📐 High-Level Architecture

### **System Components**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │  Intelligence   │
│  React 18 SPA   │◄──►│  Express.js     │    │    Layer        │
│                 │    │  Socket.io      │    │                 │
│  • UI/UX        │    │  • WebSocket    │    │  • NMJL Data    │
│  • State Mgmt   │    │  • Multiplayer  │    │  • AI Engines   │
│  • AI Interface │    │  • Coordination │    │  • Analysis     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
       │                         │                         │
       └─────────────────────────┼─────────────────────────┘
                                 │
                ┌─────────────────▼─────────────────┐
                │         User Devices              │
                │                                   │
                │  📱 Mobile  💻 Desktop  🖥️ Tablet │
                │                                   │
                │      Local Network Games          │
                └───────────────────────────────────┘
```

### **Data Flow**
1. **User Input** → Tile selection, pattern choices, game actions
2. **Local Processing** → Client-side AI analysis and recommendations
3. **State Management** → Zustand stores coordinate application state
4. **Network Sync** → Socket.io synchronizes multiplayer game state
5. **AI Response** → Real-time strategic recommendations to user

---

## 🛠️ Technology Stack

### **Frontend Architecture**
```typescript
Technology Stack:
├── React 18              // Component framework with concurrent features
├── TypeScript            // Type-safe development
├── Vite                 // Build tool and dev server
├── Zustand              // Lightweight state management
├── Tailwind CSS         // Utility-first styling
├── Socket.io Client     // WebSocket communication
└── Vitest               // Testing framework
```

**Key Design Decisions**:
- **React 18**: Concurrent rendering for smooth AI updates
- **TypeScript**: Strict type safety across complex game logic
- **Zustand**: Simple, performant state management over Redux
- **Vite**: Fast development builds and optimized production bundles
- **Tailwind**: Mobile-first responsive design with design system

### **Backend Architecture**
```typescript
Technology Stack:
├── Node.js              // JavaScript runtime
├── Express.js           // Web application framework
├── TypeScript           // Type-safe server development
├── Socket.io            // Real-time WebSocket communication
├── Helmet               // Security middleware
└── Winston              // Structured logging
```

**Key Design Decisions**:
- **Node.js**: JavaScript across stack for developer efficiency
- **Express.js**: Minimal, flexible web server framework
- **Socket.io**: Reliable WebSocket with fallbacks for multiplayer
- **In-Memory Storage**: No database needed for session-based games
- **Stateless Design**: Easy scaling and deployment

### **Intelligence Layer**
```typescript
Intelligence Architecture:
├── NMJL 2025 Data       // Official pattern definitions (71 patterns)
├── Pattern Analysis     // Mathematical pattern completion engine
├── Pattern Ranking      // 4-component scoring system (0-100 scale)
├── Tile Recommendations // Keep/pass/discard strategic advice
├── Variation Loader     // 1,002 pattern combinations cached
└── Analysis Coordinator // Engine orchestration and compatibility
```

**Key Algorithms**:
- **Pattern Matching**: Exact tile matching against 1,002 variations
- **Completion Scoring**: Mathematical analysis of pattern progress
- **Strategic Ranking**: Multi-factor scoring with opponent awareness
- **Performance Optimization**: Sub-300ms analysis with intelligent caching

---

## 🗂️ Project Structure

### **Repository Organization**
```
american-mahjong-assistant/
├── frontend/                 # React application
│   ├── src/
│   │   ├── features/        # Feature-based architecture
│   │   │   ├── landing/     # Hello Co-Pilot intro
│   │   │   ├── pattern-selection/  # NMJL pattern browser
│   │   │   ├── tile-input/  # Hand management
│   │   │   ├── charleston/  # Charleston strategy
│   │   │   ├── gameplay/    # Game Mode co-pilot
│   │   │   ├── tutorial/    # Onboarding system
│   │   │   └── post-game/   # Analytics & export
│   │   ├── ui-components/   # Reusable design system
│   │   ├── stores/          # Zustand state management
│   │   ├── services/        # AI engines & data services
│   │   ├── types/           # TypeScript definitions
│   │   └── utils/           # Utilities & routing
│   ├── public/
│   │   └── intelligence/    # NMJL data & AI assets
│   └── tests/               # Component & integration tests
├── backend/                 # Express.js server
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── socket/          # Socket.io handlers
│   │   ├── middleware/      # Express middleware
│   │   └── utils/           # Server utilities
│   └── tests/               # Server-side tests
├── shared/                  # Shared types & constants
├── docs/                    # Documentation
│   ├── user-guides/         # User documentation
│   └── technical/           # Technical documentation
└── legacy/                  # Preserved working systems
```

### **Feature-Based Architecture**
Each feature is self-contained with its own:
- **Components**: UI components specific to the feature
- **Stores**: Feature-specific state management
- **Services**: Business logic and data processing
- **Types**: TypeScript interfaces for the feature
- **Tests**: Feature-specific test suites

---

## 🧠 Intelligence System Architecture

### **3-Engine AI Pipeline**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Pattern Analysis│    │ Pattern Ranking │    │ Tile Recommend. │
│    Engine       │───►│    Engine       │───►│     Engine      │
│                 │    │                 │    │                 │
│ • Exact matching│    │ • 4-component   │    │ • Keep/Pass/    │
│ • Tile counting │    │   scoring       │    │   Discard       │
│ • Progress calc │    │ • Viability     │    │ • Strategic     │
│ • Joker rules   │    │ • Ranking       │    │   reasoning     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

#### **Engine 1: Pattern Analysis**
**Location**: `frontend/src/services/pattern-analysis-engine.ts`
- **Input**: Player hand tiles, selected patterns
- **Processing**: Exact tile matching against 1,002 pattern variations
- **Output**: Mathematical facts (completion %, tile counts, missing tiles)
- **Performance**: <100ms analysis time, cached results

#### **Engine 2: Pattern Ranking**
**Location**: `frontend/src/services/pattern-ranking-engine.ts`
- **Input**: Pattern analysis results, game context
- **Processing**: 4-component scoring system (0-40, 0-30, 0-20, 0-10)
- **Output**: Viability scores and strategic rankings
- **Factors**: Pattern progress, tile availability, difficulty, strategic value

#### **Engine 3: Tile Recommendations**
**Location**: `frontend/src/services/tile-recommendation-engine.ts`
- **Input**: Ranked patterns, current hand, opponent data
- **Processing**: Strategic analysis with opponent awareness
- **Output**: Keep/pass/discard recommendations with reasoning
- **Features**: Pattern switching detection, alternative suggestions

### **NMJL Data Integration**
**Source**: `frontend/public/intelligence/nmjl-patterns/`
- **nmjl-card-2025.json**: Official NMJL pattern definitions (71 patterns)
- **pattern-variations.json**: Complete tile combinations (1,002 variations, 678KB)
- **Validation**: Runtime type checking and data integrity verification
- **Performance**: Lazy loading with intelligent caching strategies

---

## 🔄 State Management Architecture

### **Zustand Store Design**
```typescript
Store Architecture:
├── game-store.ts           # Core game state and coordination
├── pattern-store.ts        # Pattern selection and filtering
├── intelligence-store.ts   # AI analysis and recommendations
├── tile-store.ts          # Hand management and tile operations
├── charleston-store.ts    # Charleston strategy and phase management
├── room-store.ts          # Multiplayer room and player management
└── ui-store.ts            # User preferences and interface state
```

**Design Principles**:
- **Feature-Based Separation**: Each store handles specific domain logic
- **Minimal Cross-Store Dependencies**: Loose coupling between stores
- **TypeScript Integration**: Full type safety with proper inference
- **DevTools Support**: Redux DevTools for debugging
- **Persistence**: LocalStorage integration for user preferences

### **State Flow Patterns**
```typescript
User Action → Store Update → Component Re-render → AI Analysis → State Update
     ↑                                                              ↓
     └──────────────── Recommendation Display ←──────────────────────┘
```

---

## 🎮 Game Flow Architecture

### **Phase-Based Game Management**
```
Pattern Selection → Tile Input → Charleston → Gameplay → Post-Game
       ↓               ↓           ↓            ↓          ↓
   Select 3-5      Build Hand   Strategic   AI Co-Pilot  Analytics
   Patterns       (13-14 tiles)  Passing   Recommendations & Export
```

#### **Phase 1: Pattern Selection**
- **Purpose**: Choose target patterns from NMJL 2025 card
- **Features**: Interactive pattern cards, difficulty filtering, strategic tips
- **AI Integration**: Pattern compatibility analysis and recommendations

#### **Phase 2: Tile Input**
- **Purpose**: Build starting hand with physical tiles
- **Features**: Visual tile selector, hand validation, sample hands
- **AI Integration**: Real-time pattern progress analysis

#### **Phase 3: Charleston**
- **Purpose**: Strategic tile passing with opponents
- **Features**: Pass recommendations, hand optimization, round tracking
- **AI Integration**: Advanced Charleston strategy engine

#### **Phase 4: Gameplay**
- **Purpose**: Main game with AI co-pilot assistance
- **Features**: Draw/discard recommendations, call notifications, turn management
- **AI Integration**: Real-time strategic analysis and pattern switching

#### **Phase 5: Post-Game**
- **Purpose**: Game analysis and statistics
- **Features**: Performance analytics, pattern effectiveness, export capabilities
- **AI Integration**: Game analysis and learning insights

### **Route Protection System**
**Location**: `frontend/src/utils/RouteGuard.tsx`
- **Purpose**: Enforce proper game flow progression
- **Logic**: Prevents access to phases without completing prerequisites
- **User Experience**: Automatic redirection to appropriate phase
- **Error Handling**: Graceful recovery from invalid navigation

---

## 🔗 Multiplayer Architecture

### **Network Communication**
```typescript
Client A ←→ Socket.io ←→ Express Server ←→ Socket.io ←→ Client B
                            ↕
                      Game State Manager
                            ↕
                   Room & Player Management
```

#### **Connection Management**
**Location**: `frontend/src/hooks/useSocket.ts`
- **Features**: Auto-reconnection, event queuing, health monitoring
- **Reliability**: Connection resilience with graceful degradation
- **Performance**: Ping monitoring and latency tracking
- **Error Handling**: Comprehensive error recovery and user feedback

#### **Room Management**
**Location**: `frontend/src/stores/room-store.ts`
- **Features**: Room creation, player joining, host management
- **Synchronization**: Real-time player state coordination
- **Security**: Room codes and player validation
- **Scalability**: In-memory storage for session-based games

#### **Game Synchronization**
- **Shared State**: Discards, exposed tiles, turn order, phase progression
- **Private State**: Individual hands, AI recommendations, pattern selections
- **Conflict Resolution**: Host authority for game state decisions
- **Performance**: Minimal network traffic, efficient state updates

---

## 📱 Mobile-First Design Architecture

### **Responsive Design System**
**Base Unit**: Tailwind CSS with custom design tokens
- **Breakpoints**: Mobile (default), Tablet (768px+), Desktop (1024px+)
- **Touch Targets**: Minimum 44px for accessibility
- **Typography**: Responsive scale with mobile readability
- **Color System**: High contrast with colorblind-friendly palette

### **Touch Interaction Patterns**
- **Tile Selection**: Large touch targets with haptic feedback
- **Gesture Support**: Swipe navigation and pinch-to-zoom
- **Thumb-Zone Optimization**: Critical actions within easy reach
- **Context Menus**: Long-press for advanced options

### **Performance Optimization**
- **Bundle Splitting**: Lazy loading for non-critical features
- **Image Optimization**: Optimized tile sprites and progressive loading
- **Memory Management**: Efficient component lifecycle and cleanup
- **Battery Efficiency**: Reduced animations and background processing

---

## 🔒 Security Architecture

### **Client-Side Security**
- **Content Security Policy**: Strict CSP headers prevent XSS attacks
- **Input Validation**: All user inputs validated and sanitized
- **State Protection**: Secure state management with type safety
- **Private Data**: Player hands never transmitted to other clients

### **Server-Side Security**
- **Helmet Integration**: Security headers and attack prevention
- **Rate Limiting**: API endpoint protection against abuse
- **CORS Configuration**: Strict cross-origin resource sharing
- **Input Sanitization**: All incoming data validated and cleaned

### **Network Security**
- **HTTPS Enforcement**: TLS encryption for all communications
- **WebSocket Security**: Secure Socket.io connections with validation
- **Data Minimization**: Only necessary data transmitted between clients
- **Session Security**: Secure session management and token handling

---

## 🧪 Testing Architecture

### **Testing Strategy**
```typescript
Testing Pyramid:
├── Unit Tests           # Individual functions and components
├── Integration Tests    # Feature workflows and store interactions
├── End-to-End Tests     # Complete user journeys
└── Performance Tests    # Load times and AI analysis speed
```

#### **Unit Testing**
**Framework**: Vitest with React Testing Library
- **Components**: Isolated component behavior and rendering
- **Services**: Business logic and AI engine functionality
- **Stores**: State management and action dispatching
- **Utilities**: Helper functions and data processing

#### **Integration Testing**
- **Feature Workflows**: Complete user interactions within features
- **Store Integration**: Cross-store communication and data flow
- **API Integration**: Backend communication and error handling
- **Real Data Testing**: NMJL pattern data and AI analysis accuracy

#### **End-to-End Testing**
- **User Journeys**: Complete game flow from pattern selection to post-game
- **Multiplayer Scenarios**: Room creation, joining, and synchronization
- **Error Recovery**: Network failures and application resilience
- **Cross-Device Testing**: Mobile, tablet, and desktop compatibility

---

## ⚡ Performance Architecture

### **Frontend Performance**
- **Bundle Size**: Target <500KB initial load with code splitting
- **Load Times**: <3 seconds on 3G networks
- **Runtime Performance**: 60fps interactions with smooth animations
- **Memory Usage**: Efficient component lifecycle and garbage collection

### **AI Performance**
- **Analysis Speed**: <300ms for pattern analysis and recommendations
- **Caching Strategy**: Intelligent result caching with cache invalidation
- **Data Loading**: Lazy loading of pattern variations and intelligence data
- **Background Processing**: Web Workers for heavy computational tasks

### **Network Performance**
- **Connection Optimization**: Efficient WebSocket usage with minimal overhead
- **Data Compression**: Optimized payload sizes for mobile networks
- **Offline Capability**: Progressive Web App features for offline play
- **CDN Integration**: Static asset delivery optimization

---

## 🔄 Development Architecture

### **Development Workflow**
```
Feature Planning → Implementation → Testing → Code Review → Integration → Deployment
       ↑                                                                    ↓
       └─────────────────── Monitoring & Feedback ←──────────────────────────┘
```

#### **Code Quality Standards**
- **TypeScript Strict Mode**: Zero `any` types, comprehensive type coverage
- **ESLint Configuration**: Zero warnings/errors enforced in CI/CD
- **Code Formatting**: Prettier integration with consistent style
- **Git Workflow**: Feature branches with protected main branch

#### **Build System**
- **Vite Configuration**: Optimized development and production builds
- **Hot Module Replacement**: Instant feedback during development
- **TypeScript Compilation**: Strict type checking across the stack
- **Asset Optimization**: Automatic image compression and bundling

#### **CI/CD Pipeline**
- **Automated Testing**: All tests must pass before deployment
- **Build Validation**: Both frontend and backend builds verified
- **Security Scanning**: Dependency vulnerability checking
- **Performance Monitoring**: Bundle size and load time validation

---

## 🎯 Architecture Evolution

### **Current State (Phase 6 Complete)**
- ✅ **MVP Complete**: Full game flow with AI co-pilot
- ✅ **Production Ready**: Zero errors, optimized builds, monitoring
- ✅ **Intelligence System**: 3-engine AI with real NMJL data
- ✅ **Testing Infrastructure**: Comprehensive test coverage
- ✅ **Documentation**: User guides and technical documentation

### **Future Architecture Considerations**
- **WebAssembly Integration**: Complex AI calculations for advanced features
- **PWA Enhancement**: Full offline capabilities and app-like installation  
- **Microservices Evolution**: Service decomposition for scale
- **ML/AI Enhancement**: Machine learning for personalized recommendations
- **Cross-Platform Native**: React Native mobile apps with shared business logic

---

## 🏆 Architectural Strengths

### **Scalability**
- **Stateless Backend**: Easy horizontal scaling
- **Feature-Based Frontend**: Independent development and deployment
- **Efficient State Management**: Minimal re-renders and optimal performance
- **Modular Design**: Easy feature additions and modifications

### **Maintainability**
- **TypeScript Throughout**: Compile-time error prevention
- **Clear Separation of Concerns**: Logical code organization
- **Comprehensive Testing**: Confidence in refactoring and changes
- **Documentation**: Thorough technical and user documentation

### **User Experience**
- **Mobile-First Design**: Optimized for primary use case
- **Performance Focused**: Fast, responsive interactions
- **Accessibility**: WCAG compliance and inclusive design
- **Progressive Enhancement**: Works across all devices and connections

### **Developer Experience**
- **Modern Tools**: Latest frameworks and development tools
- **Fast Feedback**: Hot reload and instant testing
- **Clear Architecture**: Easy onboarding for new developers
- **Quality Standards**: Automated code quality enforcement

---

The American Mahjong Assistant architecture provides a solid foundation for intelligent co-pilot assistance while maintaining the social, physical nature of real-world American Mahjong games. The system is designed for scale, performance, and maintainability while delivering an exceptional user experience. 🏗️✨