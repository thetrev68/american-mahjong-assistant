# American Mahjong Web Assistant

A local network web application that assists groups playing American Mahjong in person. Players connect their phones to a shared game session where they can input their tiles privately, receive strategic recommendations, and coordinate Charleston passes digitally while playing with physical tiles.

## 🎯 Key Principle

This is a **shared game assistant** for in-person play, not a digital version of the game. It creates a digital layer over physical gameplay to enhance the social experience rather than replace it.

## ✨ Features

### 🏠 Local Network Gaming
- Host creates a room with a simple code (e.g., "TILE123")
- Players join via room code on their phones
- All communication stays on local WiFi - no internet required after initial load

### 🔒 Private Tile Management
- Each player inputs their tiles privately on their device
- Hand analysis and strategic recommendations shown only to that player
- Charleston pass selections made privately
- Mahjong validation when declared

### 🌐 Shared Game State
- Track all discarded tiles (visible to everyone)
- Record exposed sets when players call tiles
- Coordinate Charleston passes between players
- Basic scoring and winner declaration

### 🧠 Strategic Assistance
- Hand pattern matching against 2025 NMJL card
- Probability calculations based on visible tiles
- Charleston passing recommendations
- Basic defensive play suggestions
- Joker usage validation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (we're using v22.17.0)
- All players need smartphones/tablets on the same WiFi network

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/american-mahjong-assistant.git
   cd american-mahjong-assistant
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd ../backend
   npm install
   ```

### Running the Application

1. **Start the backend server** (in one terminal)
   ```bash
   cd backend
   npm run dev
   ```
   Server runs at `http://localhost:3001`

2. **Start the frontend** (in another terminal)
   ```bash
   cd frontend
   npm run dev
   ```
   App available at `http://localhost:5173`

3. **Connect other players**
   - Host shares their computer's local IP address
   - Other players visit `http://[HOST_IP]:5173` on their phones
   - Enter the room code to join the game

## 🏗️ Technical Architecture

### Frontend
- **React** with **TypeScript** for type safety
- **Vite** for fast development and building
- **Tailwind CSS** for responsive, mobile-first design
- **Socket.io-client** for real-time communication
- **Progressive Web App** capabilities for mobile experience

### Backend
- **Node.js** with **Express** server
- **Socket.io** for WebSocket real-time communication
- **TypeScript** for better code reliability
- **In-memory storage** (no database required)
- **CORS configured** for local network access

### Communication Flow
```
User Action → Local State → Socket Emit → Server Validation → Broadcast → All Clients Update
```

## 📱 User Experience

### Connection Flow
1. Host opens website and starts new game
2. App generates simple room code
3. Other players enter room code on their devices
4. All players join shared game session

### Gameplay Flow
1. **Setup**: Players input their starting tiles privately
2. **Charleston**: Coordinate passes digitally while handling physical tiles
3. **Live Play**: 
   - Track discards in shared view
   - Get private strategic recommendations
   - Coordinate tile calls and exposed sets
4. **Scoring**: Assist with final score calculation

## 🎮 Game States

### Private State (per player)
- Current tiles in hand
- Strategic analysis and recommendations
- Charleston pass selections
- Personal game statistics

### Shared State (room-wide)
- All discarded tiles
- Exposed sets for each player
- Current turn and game phase
- Charleston coordination status
- Timer and game flow

## 🛠️ Development

### Project Structure
```
/
├── frontend/          # React + TypeScript frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── utils/         # Game logic and utilities
│   │   └── types/         # TypeScript definitions
│   └── ...
├── backend/           # Node.js + Express backend
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── socket/        # Socket.io handlers
│   │   ├── game/          # Game state logic
│   │   └── utils/         # Helper functions
│   └── ...
└── README.md
```

### Development Standards
- **Mobile-first responsive design** - Primary interface is phone screens
- **Real-time synchronization** - All shared state updates instantly
- **Privacy boundaries** - Clear separation between private/shared data
- **Graceful degradation** - Core features work with connection issues

### Available Scripts

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

**Backend:**
- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript
- `npm start` - Run compiled JavaScript

## 🔮 Roadmap

### Phase 1: Foundation (Current)
- [x] Project setup and basic architecture
- [ ] Room creation and joining system
- [ ] Basic tile input interface
- [ ] Simple shared game state

### Phase 2: Core Gameplay
- [ ] Charleston coordination system
- [ ] Hand analysis and recommendations
- [ ] Tile calling and exposed sets
- [ ] Game timer and flow management

### Phase 3: Polish & Enhancement
- [ ] Advanced strategy features
- [ ] Better error handling and reconnection
- [ ] Performance optimization
- [ ] PWA features for mobile installation

### Future Enhancements
- [ ] Voice announcements for discards
- [ ] Multiple simultaneous games
- [ ] Basic statistics tracking
- [ ] Integration with multiple card years

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Success Definition

When groups say **"let's use the app"** instead of **"let's play without it."**

---

**Built for the social players, learning players, and mixed groups who want to enhance their American Mahjong experience while maintaining the joy of in-person play.**