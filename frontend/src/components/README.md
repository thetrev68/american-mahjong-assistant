// frontend/src/components/README.md
// Component Structure & Architecture Guide
// This defines the component hierarchy and responsibilities for consistency across sessions

/*
========================================
COMPONENT HIERARCHY & ORGANIZATION
========================================

frontend/src/
├── components/
│   ├── ui/              # Reusable UI components
│   ├── tiles/           # Tile-related components
│   ├── game/            # Game-specific components
│   ├── room/            # Room management components
│   └── shared/          # Cross-cutting components
├── pages/               # Route components (main screens)
├── hooks/               # Custom React hooks
└── utils/               # Helper functions

========================================
PAGES (Route Components)
========================================
*/

// pages/HomePage.tsx - Landing/room creation
interface HomePageProps {}

// pages/JoinRoomPage.tsx - Room joining flow  
interface JoinRoomPageProps {}

// pages/GameLobbyPage.tsx - Pre-game setup
interface GameLobbyPageProps {
  roomId: string;
}

// pages/GamePlayPage.tsx - Active game container
interface GamePlayPageProps {
  roomId: string;
}

/*
========================================
GAME COMPONENTS (game/)
========================================
*/

// game/GameContainer.tsx - Main game orchestrator
interface GameContainerProps {
  roomId: string;
}
// Responsibilities:
// - Socket connection management
// - Game state management
// - View mode switching (shared/private)
// - Real-time event handling

// game/SharedGameView.tsx - What everyone sees during play
interface SharedGameViewProps {
  gameRoom: GameRoom;
  currentPlayer: Player;
  onPlayerAction: (action: PlayerAction) => void;
}
// Responsibilities:
// - Turn indicator
// - Discard pile display
// - Exposed sets display
// - Action buttons (call/pass)
// - Game timer

// game/PrivateGameView.tsx - Individual player's private view
interface PrivateGameViewProps {
  playerState: PrivatePlayerState;
  gameRoom: GameRoom;
  onTileUpdate: (tiles: Tile[]) => void;
  onRequestAnalysis: () => void;
}
// Responsibilities:
// - Private tile input
// - Hand analysis display
// - Strategic recommendations
// - Charleston selection

// game/CharlestonView.tsx - Charleston coordination interface
interface CharlestonViewProps {
  charlestonState: CharlestonState;
  playerTiles: Tile[];
  selectedTiles: Tile[];
  onTileSelect: (tile: Tile) => void;
  onConfirmPass: () => void;
}
// Responsibilities:
// - Charleston phase display
// - Tile selection for passing
// - Player readiness status
// - Pass confirmation

/*
========================================
TILE COMPONENTS (tiles/)
========================================
*/

// tiles/TileGrid.tsx - Full tile selection interface
interface TileGridProps {
  availableTiles: Tile[];
  selectedTiles: Tile[];
  onTileSelect: (tile: Tile) => void;
  mode: 'input' | 'selection' | 'display';
  readonly?: boolean;
}
// Responsibilities:
// - Organized tile layout (by suit)
// - Tile selection/deselection
// - Tile count indicators
// - Touch-friendly interaction

// tiles/TileComponent.tsx - Individual tile display
interface TileComponentProps {
  tile: Tile;
  isSelected?: boolean;
  isDisabled?: boolean;
  showCount?: boolean;
  count?: number;
  size?: 'small' | 'medium' | 'large';
  onClick?: (tile: Tile) => void;
  onDoubleClick?: (tile: Tile) => void;
}
// Responsibilities:
// - Tile sprite rendering
// - Selection state display
// - Touch interaction handling
// - Accessibility support

// tiles/TileHand.tsx - Display player's current hand
interface TileHandProps {
  tiles: Tile[];
  isPrivate: boolean;
  layout: 'horizontal' | 'grid';
  interactive?: boolean;
  onTileClick?: (tile: Tile) => void;
}
// Responsibilities:
// - Hand layout and organization
// - Tile arrangement
// - Private/public display modes

// tiles/DiscardPile.tsx - Show discarded tiles
interface DiscardPileProps {
  discards: DiscardedTile[];
  maxVisible?: number;
  onTileCall?: (tile: Tile, callType: ActionType) => void;
}
// Responsibilities:
// - Chronological discard display
// - Latest discard highlighting
// - Call action triggers

/*
========================================
ROOM COMPONENTS (room/)
========================================
*/

// room/RoomCreation.tsx - Host creates new room
interface RoomCreationProps {
  onRoomCreated: (roomId: string) => void;
}
// Responsibilities:
// - Host name input
// - Game settings configuration
// - Room code generation display

// room/RoomJoining.tsx - Players join existing room
interface RoomJoiningProps {
  onRoomJoined: (roomId: string, playerId: string) => void;
}
// Responsibilities:
// - Room code input
// - Player name input
// - Connection validation

// room/PlayerList.tsx - Show all players in room
interface PlayerListProps {
  players: Player[];
  currentPlayerId: string;
  showPositions?: boolean;
  showStatus?: boolean;
}
// Responsibilities:
// - Player name display
// - Connection status indicators
// - Position assignments (East/South/West/North)
// - Ready status

// room/GameSettings.tsx - Configure game options
interface GameSettingsProps {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  isHost: boolean;
  gameStarted: boolean;
}
// Responsibilities:
// - Charleston toggle
// - Timer settings
// - Card year selection
// - Joker/flower options

/*
========================================
SHARED COMPONENTS (shared/)
========================================
*/

// shared/GameTimer.tsx - Universal timer component
interface GameTimerProps {
  timeRemaining: number;
  totalTime: number;
  onTimeUp: () => void;
  variant: 'turn' | 'charleston' | 'game';
  showWarning?: boolean;
}
// Responsibilities:
// - Countdown display
// - Visual urgency indicators
// - Auto-actions on timeout

// shared/ActionButtons.tsx - Game action interface
interface ActionButtonsProps {
  availableActions: ActionType[];
  onAction: (action: ActionType, data?: any) => void;
  disabled?: boolean;
  context: 'discard' | 'call' | 'charleston';
}
// Responsibilities:
// - Context-appropriate actions
// - Action validation
// - Confirmation dialogs

// shared/GameNotifications.tsx - Toast/alert system
interface GameNotificationsProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  position: 'top' | 'bottom';
}
// Responsibilities:
// - Real-time event notifications
// - Error/success messages
// - Auto-dismiss handling

// shared/ConnectionStatus.tsx - Network status indicator
interface ConnectionStatusProps {
  status: 'connected' | 'disconnected' | 'reconnecting';
  onRetry?: () => void;
}
// Responsibilities:
// - Connection state display
// - Reconnection handling
// - Offline mode indicators

/*
========================================
UI COMPONENTS (ui/)
========================================
*/

// ui/Button.tsx - Standard button component
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'success';
  size: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

// ui/Modal.tsx - Modal/dialog component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size: 'small' | 'medium' | 'large';
}

// ui/Loading.tsx - Loading states
interface LoadingProps {
  size: 'small' | 'medium' | 'large';
  message?: string;
  fullScreen?: boolean;
}

// ui/ErrorBoundary.tsx - Error handling
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error }>;
}

/*
========================================
HOOKS (hooks/)
========================================
*/

// hooks/useSocket.ts - Socket connection management
interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  emit: (event: string, data: any) => void;
  on: (event: string, callback: EventCallback) => void;
  off: (event: string, callback: EventCallback) => void;
}

// hooks/useGameState.ts - Game state management
interface UseGameStateReturn {
  gameRoom: GameRoom | null;
  currentPlayer: Player | null;
  isLoading: boolean;
  error: string | null;
  updateGameState: (state: Partial<GameRoom>) => void;
}

// hooks/usePrivateState.ts - Private player state
interface UsePrivateStateReturn {
  playerState: PrivatePlayerState | null;
  updateTiles: (tiles: Tile[]) => void;
  requestAnalysis: () => void;
  recommendations: HandAnalysis | null;
}

// hooks/useTileSelection.ts - Tile selection logic
interface UseTileSelectionReturn {
  selectedTiles: Tile[];
  selectTile: (tile: Tile) => void;
  deselectTile: (tile: Tile) => void;
  clearSelection: () => void;
  isSelected: (tile: Tile) => boolean;
}

// hooks/useCharleston.ts - Charleston coordination
interface UseCharlestonReturn {
  selectedForPass: Tile[];
  selectForPass: (tile: Tile) => void;
  confirmPass: () => void;
  canConfirm: boolean;
  passesRemaining: number;
}

/*
========================================
COMPONENT INTERACTION PATTERNS
========================================
*/

// Data Flow Pattern:
// Pages -> Game Components -> Shared/Tile Components -> UI Components

// Event Flow Pattern:
// UI Components -> Game Components -> Hooks -> Socket -> Server

// State Management Pattern:
// Server State (via socket) -> Game State Hook -> Components
// Local State (via useState) -> Component only
// Private State (via private hook) -> Private components only

/*
========================================
NAMING CONVENTIONS
========================================
*/

// Files: PascalCase for components (GameContainer.tsx)
// Directories: lowercase (tiles/, game/, ui/)
// Props interfaces: ComponentNameProps
// Hook returns: UseHookNameReturn
// Event handlers: onActionName
// Boolean props: isState, hasFeature, canAction, showElement

/*
========================================
MOBILE-FIRST CONSIDERATIONS
========================================
*/

// Touch targets: Minimum 44px for interactive elements
// Responsive breakpoints: sm (640px), md (768px), lg (1024px)
// Touch interactions: onTouchStart for immediate feedback
// Swipe gestures: For navigating between views
// Orientation: Support both portrait and landscape
// Performance: Lazy loading for heavy components
// Offline: Graceful degradation when disconnected

/*
========================================
TESTING STRATEGY
========================================
*/

// Unit tests: Individual component logic
// Integration tests: Component interaction with hooks
// E2E tests: Full user flows (join room, play game)
// Socket tests: Real-time event handling
// Mobile tests: Touch interactions and responsive design