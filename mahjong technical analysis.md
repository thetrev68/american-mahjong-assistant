You're absolutely right - let's establish a solid foundation that maintains consistency across sessions while preserving creative flexibility. Here's the deeper planning layer:

## Development Framework & Consistency Guide

### Core Design Principles (Non-negotiable)
1. **Mobile-first responsive design** - Primary interface is phone screens
2. **Real-time synchronization** - All shared state updates instantly
3. **Privacy boundaries** - Clear separation between private/shared data
4. **Graceful degradation** - Core features work even with connection hiccups
5. **Minimal cognitive load** - Interface should feel intuitive during actual gameplay

### Technical Standards & Patterns

**State Management Philosophy**
```
Private State (per player): Tiles, analysis, recommendations
Shared State (room-wide): Discards, exposed sets, turn order, Charleston status
Ephemeral State: Connection status, UI feedback, temporary selections
```

**Component Architecture Pattern**
- **Pages**: Room creation, game lobby, active game
- **Shared Components**: Game state display, timer, player status
- **Private Components**: Tile input, hand analysis, recommendations
- **Real-time Components**: Charleston coordination, tile calling

**Data Flow Consistency**
```
User Action → Local State Update → Socket Emit → Server Validation → Broadcast → All Clients Update
```

### User Experience Guardrails

**Connection Flow Standards**
- Room codes must be **memorable** (avoid confusing characters like 0/O, 1/I)
- Connection feedback must be **immediate** (loading states, error messages)
- **Fallback instructions** for troubleshooting network issues

**Gameplay Interaction Standards**
- **Touch targets** minimum 44px for mobile
- **Confirmation patterns** for irreversible actions (Charleston passes, Mahjong calls)
- **Visual hierarchy** that works during actual game focus
- **Consistent iconography** for tiles, actions, and game state

### Game Logic Boundaries

**What the App Handles**
- Tile tracking and validation
- Charleston coordination
- Basic strategy recommendations
- Score calculation assistance

**What Players Still Handle**
- Physical tile manipulation
- Rule enforcement and disputes
- Social interaction and table talk
- Final game decisions

### Technical Constraints Framework

**Local Network Requirements**
- Must work on standard home WiFi without router configuration
- Graceful handling of IP address changes
- Support for mixed device types (iOS Safari, Android Chrome, etc.)

**Performance Targets**
- Initial page load: <3 seconds
- Real-time updates: <200ms latency
- Supports 4 concurrent connections reliably
- Works with slow/unstable local networks

### Development Session Consistency

**File Organization Standard**
```
/frontend (React/Vite)
  /src
    /components (reusable UI)
    /pages (route components)
    /hooks (custom React hooks)
    /utils (game logic, calculations)
    /types (TypeScript definitions)

/backend (Node.js)
  /src
    /routes (API endpoints)
    /socket (real-time handlers)
    /game (game state logic)
    /utils (helper functions)
```

**Naming Conventions**
- Components: PascalCase (`TileInput`, `CharlestonPanel`)
- Files: kebab-case (`tile-input.tsx`, `charleston-panel.tsx`)
- Socket events: kebab-case (`join-room`, `update-tiles`)
- Game state keys: camelCase (`playerTiles`, `discardedTiles`)

### Feature Development Priorities

**Phase 1: Foundation (MVP)**
- Room creation/joining works reliably
- Basic tile input and display
- Simple shared game state (discards, turn tracking)

**Phase 2: Core Gameplay**
- Charleston coordination system
- Hand analysis and recommendations
- Tile calling and exposed sets

**Phase 3: Polish & Enhancement**
- Advanced strategy features
- Better error handling
- Performance optimization

### Creative Freedom Zones

**UI/UX Design**
- Visual styling and theme (within mobile-first constraints)
- Animation and interaction details
- Layout optimization for different screen sizes

**Game Strategy Features**
- Recommendation algorithms and display
- Probability calculations and presentation
- Advanced analysis features

**Technical Implementation**
- Specific React patterns and hooks
- Socket.io event structure details
- Performance optimization approaches

---

**Consistency Anchor Points for Future Sessions:**
1. Reference this planning document for architectural decisions
2. Always check mobile responsiveness first
3. Maintain the private/shared state boundaries
4. Test with 4 concurrent connections
5. Keep the "shared assistant" philosophy central
