# American Mahjong Web Assistant - Functional Analysis

## 1. Project Overview

A local network web application that assists groups playing American Mahjong in person. Players connect their phones to a shared game session where they can input their tiles privately, receive strategic recommendations, and coordinate Charleston passes digitally while playing with physical tiles.

**Key Principle**: This is a **shared game assistant** for in-person play, not a digital version of the game.

## 2. User Experience Model

### Connection Flow
1. **Host** opens website and starts new game
2. App generates simple room code (e.g., "TILE123")
3. **Other players** visit same website and enter room code
4. All players join shared game session on local network
5. Each player has private tile view + shared game state

### Target Users
- **Social Players**: Friends and family who play weekly
- **Learning Players**: New players who need rule guidance
- **Mixed Groups**: Experienced players helping beginners

## 3. Core Features

### Game Setup
- Host creates room with simple code generation
- Players join via room code entry (or host can manage non-participating players)
- Set player names and dealer position
- Configure which players are using devices vs. being managed by host
- Basic game timer for Charleston and overall timing

### Private Tile Management
- Each player inputs their own tiles privately
- Hand analysis and recommendations shown only to that player
- Charleston pass selections made privately
- Mahjong validation when declared

### Shared Game State
- Track all discarded tiles (visible to everyone)
- Record exposed sets when players call tiles
- Coordinate Charleston passes between players
- Basic scoring and winner declaration

### Strategic Assistance
- Hand pattern matching against 2025 NMJL card
- Probability calculations based on visible tiles
- Charleston passing recommendations
- Basic defensive play suggestions
- Joker usage validation

## 4. User Journey

### Game Setup (2-3 minutes)
```
Host Phone:
┌─────────────────────────┐
│ 🀄 Mahjong Assistant    │
│                         │
│ [Start New Game]        │
│                         │
│ Room Code: TILE123      │
│ Share this code!        │
│                         │
│ Players Joined: 1/4     │
│ • Sarah (you)           │
│                         │
│ Waiting for players...  │
└─────────────────────────┘

Other Players' Phones:
┌─────────────────────────┐
│ 🀄 Mahjong Assistant    │
│                         │
│ Join Game               │
│                         │
│ Room Code: [TILE123]    │
│ Your Name: [Mike___]    │
│                         │
│ [Join Game]             │
└─────────────────────────┘
```

### Tile Input (Private per player)
```
┌─────────────────────────┐
│ Your Tiles (Private)    │
│                         │
│ Dots: [1][2][3][4][5]   │
│       ●   ●        ●    │
│                         │
│ Bams: [1][2][3][4][5]   │
│   ●                     │
│                         │
│ Cracks: [1][2][3][4][5] │
│             ●   ●       │
│                         │
│ Winds: [N][S][E][W]     │
│ Dragons: [R][G][W]      │
│ Special: [F]            │
│                         │
│ [Analyze Hand]          │
└─────────────────────────┘
```

### Charleston Phase (Coordinated)
```
┌─────────────────────────┐
│ Charleston: Right Pass  │
│                         │
│ Your Recommendations:   │
│ Pass: [9D][W][F]       │
│                         │
│ Select 3 tiles to pass: │
│ [9D]✓ [W]✓ [F]✓       │
│                         │
│ [Confirm Pass]          │
│                         │
│ Waiting for others...   │
│ ✓ Sarah  ⏳ Mike       │
│ ✓ Lisa   ⏳ John       │
└─────────────────────────┘
```

### Live Gameplay (Mixed private/shared)
```
Private View:
┌─────────────────────────┐
│ Your Strategy           │
│                         │
│ Target: LIKE NUMBERS    │
│ Need: [2C][7C]         │
│ Probability: 68%        │
│                         │
│ Discard Suggestion:     │
│ 🟢 [9D] Safe           │
│ 🟡 [W] Caution         │
│                         │
│ [Select Discard]        │
└─────────────────────────┘

Shared View:
┌─────────────────────────┐
│ Game State              │
│ Turn: East | ⏱️ 23:45   │
│                         │
│ Recent Discards:        │
│ [2B][5D][N][7C][F]     │
│                         │
│ Exposed Sets:           │
│ Sarah: [1C][1C][1C]    │
│ Mike: [R][R][R]        │
│                         │
│ [Call Tile] [Pass]      │
└─────────────────────────┘
```

## 5. Technical Architecture

### Frontend (React Web App)
- Responsive design for mobile browsers
- Real-time updates via WebSocket connections
- Local storage for temporary game state
- Progressive Web App (PWA) capabilities

### Backend (Simple Node.js)
- Lightweight server running on host device
- WebSocket server for real-time communication
- Room management with simple codes
- No persistent database needed

### Networking
- Host device creates local WebSocket server
- Other devices connect via local network IP
- All communication stays on local WiFi
- No internet connection required after initial load

## 6. Key User Flows

### Room Creation Flow
1. Host opens website
2. Clicks "Start New Game"
3. App generates room code and starts local server
4. Displays connection info for others

### Player Join Flow
1. Player opens same website
2. Enters room code and name
3. Connects to host's local server
4. Joins shared game session

### Charleston Coordination
1. Each player selects tiles to pass privately
2. App waits for all players to confirm
3. Passes are distributed simultaneously
4. Players update their hands with received tiles

### Tile Calling Process
1. Player discards tile (visible to all)
2. Other players see discard in shared view
3. Anyone can "call" the tile for exposed set
4. App validates the call and updates game state

## 7. Success Metrics

### Primary Goals
- **Reduces game friction**: Charleston coordination is seamless
- **Educational value**: New players learn faster with guidance
- **Group harmony**: Everyone has equal access to assistance
- **Maintains social aspect**: Enhances rather than replaces interaction

### Technical Goals
- **Easy connection**: Room codes work reliably
- **Responsive performance**: Updates happen instantly
- **Stable connections**: Game doesn't drop during play
- **Cross-device compatibility**: Works on all phones/tablets

## 8. Development Phases

### Phase 1: Basic Connection
- Room creation and joining
- Simple shared game state
- Basic tile input interface

### Phase 2: Game Logic
- Hand analysis and recommendations
- Charleston coordination
- Discard tracking

### Phase 3: Polish
- Game timer and flow management
- Improved UI/UX
- Error handling and reconnection

## 9. Constraints & Considerations

### Technical Constraints
- **Local network only**: All devices must be on same WiFi
- **Host dependency**: Game ends if host disconnects
- **Browser limitations**: Some mobile browsers may have restrictions
- **No cloud backup**: Game state lost if host device fails

### User Experience Constraints
- **Setup overhead**: Still requires initial coordination to join
- **Device requirement**: Everyone needs a smartphone/tablet OR host can manage non-participating players
- **Learning curve**: New interface to learn alongside game rules
- **Mixed tech comfort**: Some players may prefer traditional play

### Mitigation Strategies
- **Clear connection instructions**: Simple visual guides for joining
- **Graceful degradation**: Core features work even with connection issues
- **Host migration**: Ability to transfer host role if needed
- **Offline fallback**: Basic features work without connection
- **Mixed participation**: Non-tech players can still participate - host manages their tiles and strategy on their behalf

## 10. Future Enhancements (If Successful)

### Immediate Improvements
- Voice announcements for discards
- Customizable timer settings
- Better error recovery

### Advanced Features
- Multiple simultaneous games
- Basic statistics tracking
- Integration with multiple card years

### Community Features
- Shareable room links
- Basic tournament support
- Tips and strategy guides

---

**Key Differentiator**: This app creates a **shared digital layer** over physical gameplay, enhancing the social experience rather than replacing it.

**Success Definition**: When groups say "let's use the app" instead of "let's play without it."