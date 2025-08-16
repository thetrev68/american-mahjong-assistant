# American Mahjong Intelligent Co-Pilot

A modern web application that serves as an **intelligent co-pilot** for groups playing American Mahjong in person. Players connect their devices to receive AI-powered pattern analysis and strategic recommendations while maintaining full control over their gameplay decisions.

## 🎯 Core Philosophy: Co-Pilot, Not Auto-Pilot

This is a **co-pilot system** that enhances human decision-making rather than replacing it:

- **You choose** your target patterns from authentic NMJL 2025 data
- **AI suggests** keep/pass/discard recommendations with clear reasoning  
- **You decide** which advice to follow based on your strategy
- **Everyone wins** through better understanding and improved gameplay

## ✨ Current Features

### 🎯 Intelligent Pattern Selection
- Browse and search all **71 authentic NMJL 2025 patterns**
- Advanced filtering by difficulty, points, jokers, and sections
- Interactive pattern cards with visual difficulty indicators
- Multiple target pattern tracking with strategic insights
- Real tournament-quality pattern data integration

### 🧠 AI-Powered Intelligence (Coming Soon)
- Real-time hand analysis against selected patterns
- Strategic tile recommendations with clear reasoning
- Charleston passing suggestions based on pattern requirements
- Completion probability calculations
- Defensive play recommendations

### 🌐 Social Gaming Features (Legacy System Preserved)
- Local network multiplayer for in-person groups
- Private tile input with shared game coordination
- Charleston passing coordination
- Shared discard tracking and game state management

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (tested on v22.17.0)
- **Modern web browser** (Chrome, Safari, Firefox, Edge)
- **Local WiFi network** for multiplayer features

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/thetrev68/american-mahjong-assistant.git
   cd american-mahjong-assistant
   ```

2. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

### Running the Application

**Start the frontend development server:**
```bash
cd frontend
npm run dev
```

The app will be available at **http://localhost:5175**

**For multiplayer features** (when implemented):
- Start the backend: `cd backend && npm run dev`
- Other players visit `http://[HOST_IP]:5175` on their devices

## 🏗️ Modern Architecture

### Frontend Technology Stack
- **React 18** with **TypeScript** for type safety and modern features
- **Vite** for lightning-fast development and building
- **Zustand** for efficient state management with devtools
- **Tailwind CSS** with custom design system and glassmorphism effects
- **Feature-based architecture** for scalable code organization

### Project Structure
```
frontend/src/
├── features/              # User-facing features
│   ├── landing/          # Hello Co-Pilot welcome experience
│   ├── pattern-selection/ # NMJL pattern browsing & selection
│   └── [future features] # Tile input, charleston, game interface
├── ui-components/        # Reusable design system
│   ├── Button.tsx        # Modern buttons with variants
│   ├── Card.tsx          # Glassmorphism card components
│   └── layout/           # Responsive layout components
├── stores/               # Zustand state management
├── services/             # Data services and API clients
├── types/                # TypeScript type definitions
└── utils/                # Utilities and routing
```

### Intelligence Architecture
```
intelligence/             # AI and data processing
├── nmjl-patterns/       # Authentic NMJL 2025 pattern data
└── [analysis engines]   # Pattern matching and recommendation systems

legacy/                   # Preserved working systems
├── frontend/            # Original multiplayer implementation
├── backend/             # Socket.io server and game logic
└── [documentation]     # Original analysis and planning docs
```

## 📱 User Experience

### Pattern Selection Flow
1. **Welcome** - Hello Co-Pilot introduction with feature overview
2. **Browse** - Explore all 71 authentic NMJL 2025 patterns  
3. **Filter** - Search by difficulty, points, jokers, or sections
4. **Select** - Choose your primary target and star additional options
5. **Strategize** - Get AI insights and pattern completion tips

### Future Game Flow (In Development)
1. **Setup** - Input tiles privately with AI validation
2. **Analysis** - Real-time pattern matching and recommendations
3. **Charleston** - AI-guided passing suggestions (optional)
4. **Live Play** - Strategic advice throughout the game
5. **Learning** - Post-game insights and improvement suggestions

## 🎮 Development Progress

### ✅ CHUNK 1: Foundation Setup & Basic UI
- Modern React 18 + TypeScript + Vite architecture
- Zustand stores with devtools and persistence
- UI component library with modern design system
- Responsive layout components and routing
- Hello Co-Pilot landing page with feature showcase

### ✅ CHUNK 2: Pattern Selection Foundation
- NMJL 2025 service loading authentic pattern data
- Pattern store with selection and filtering capabilities
- Interactive pattern cards with visual indicators
- Advanced search and multi-criteria filtering
- Pattern grid with responsive layout and empty states
- Selected patterns panel with strategic tips

### 🔄 CHUNK 3-10: Upcoming Features
- **Tile Input System** - Private tile management with animations
- **Intelligence Panel** - Layer Cake UI for progressive information disclosure
- **Charleston Coordination** - AI-assisted passing recommendations
- **Live Game Interface** - Real-time strategic assistance
- **Statistics & History** - Learning insights and progress tracking
- **Polish & Optimization** - Performance, accessibility, and PWA features

## 🛠️ Development

### Available Scripts

**Frontend:**
- `npm run dev` - Start development server at http://localhost:5175
- `npm run build` - Build for production (includes TypeScript validation)
- `npm run lint` - Run ESLint code quality checks
- `npm run preview` - Preview production build locally

**Backend (Legacy System):**
- `npm run dev` - Start Socket.io server with hot reload
- `npm run build` - Compile TypeScript
- `npm start` - Run compiled JavaScript

### Development Standards
- **TypeScript strict mode** for maximum type safety
- **Mobile-first responsive design** optimized for touch devices
- **Feature-based architecture** with clear separation of concerns
- **Modern state management** with Zustand over Redux
- **Real-time synchronization** for multiplayer features
- **Comprehensive error handling** with graceful degradation

### Design System
- **Color Palette**: Purple (#6366F1) and Blue (#3B82F6) with semantic colors
- **Typography**: System fonts with careful hierarchy and accessibility
- **Components**: Glassmorphism cards, modern buttons, responsive layouts
- **Animations**: Respect for `prefers-reduced-motion` with contextual feedback
- **Mobile-First**: Touch-optimized interface with large tap targets

## 📊 NMJL 2025 Integration

### Authentic Tournament Data
- **Complete NMJL 2025 card** with all 71 official patterns
- **Detailed pattern information** including points, difficulty, and joker rules
- **Type-safe data structures** with comprehensive validation
- **Fast pattern lookups** with indexed search capabilities

### Pattern Analysis Features
- **Visual pattern cards** with difficulty badges and point values
- **Advanced filtering** across multiple criteria simultaneously
- **Pattern progress tracking** with completion percentage visualization
- **Strategic insights** based on pattern characteristics and requirements

### AI Recommendations (Coming Soon)
- **Hand analysis** comparing current tiles against all possible patterns
- **Completion probability** calculations based on remaining tiles
- **Strategic suggestions** for keep/pass/discard decisions
- **Charleston integration** with pattern-aware passing recommendations

## 🎯 Success Metrics

We measure success by whether players say:
- **"Let's use the co-pilot"** instead of **"Let's play without help"**
- **"I understand patterns better now"** instead of **"This is too confusing"**  
- **"I'm making better decisions"** instead of **"I don't know what to do"**
- **"This enhances our game"** instead of **"This distracts from playing"**

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the chunk-based development approach in `docs/CO_PILOT_BUILD_PLAN.md`
4. Ensure TypeScript compliance and mobile responsiveness
5. Commit with clear messages (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request with detailed description

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎲 Built for Players Who Want to Learn and Improve

Whether you're a **beginner** learning patterns, an **intermediate** player improving strategy, or an **expert** looking for optimal decisions, this co-pilot system adapts to your needs while preserving the social joy of in-person American Mahjong.

---

**Transform your American Mahjong experience with intelligent assistance that enhances rather than replaces human judgment.**