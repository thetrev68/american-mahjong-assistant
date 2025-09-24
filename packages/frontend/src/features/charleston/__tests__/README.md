# Charleston Logic Test Suite

This directory contains comprehensive tests for the Charleston phase logic in the American Mahjong Co-Pilot system. The Charleston phase is a critical game flow component where players pass 3 tiles in a specific sequence before beginning gameplay.

## Test Coverage

### 1. Charleston Resilient Service Tests
**File**: `charleston-resilient.test.ts`
**Coverage**: Multiplayer Charleston coordination with connection resilience

- **Service Initialization**: Singleton service setup, lifecycle management
- **Player Readiness Operations**: Tile selection submission, network error handling
- **Event Handling**: Player updates, tile exchanges, phase changes, completion events
- **Operation Queue Management**: Connection failure recovery, operation prioritization
- **Error Handling**: Network failures, retry logic, graceful degradation
- **React Hook Integration**: `useCharlestonResilience` hook functionality

### 2. Charleston Integration Tests
**File**: `charleston-integration.test.tsx`
**Coverage**: Charleston integration with GameModeView and complete workflows

- **Phase Initialization**: Charleston phase entry from tile input
- **Tile Selection & Passing**: 3-tile selection validation, passing mechanics
- **Tile Reception**: Receiving tiles from other players, UI modal handling
- **Phase Transitions**: Charleston to gameplay progression, skip functionality
- **Multiplayer Integration**: Multiplayer vs solo Charleston behavior
- **Game Reset**: Charleston state cleanup during game reset
- **Error Handling**: Analysis errors, missing recommendations, phase transition errors
- **UI State Management**: Charleston-specific UI elements, modal states

### 3. Charleston Store Edge Cases
**File**: `charleston-store.edge-cases.test.ts`
**Coverage**: Edge cases and boundary conditions for Charleston store

- **Phase Management**: Rapid transitions, unusual player counts, invalid phases
- **Tile Selection**: Duplicate selections, beyond limits, empty operations
- **Analysis & Recommendations**: Empty hands, joker-only hands, small hands
- **Multiplayer State**: Invalid player IDs, rapid state changes, many players
- **Store Persistence**: Reset scenarios, multiple cycles, consistency
- **Performance**: Large datasets, concurrent operations, memory management
- **Error Recovery**: Analysis failures, state inconsistencies

### 4. Charleston AI Recommendations
**File**: `charleston-ai-recommendations.test.ts`
**Coverage**: Strategic AI analysis and tile selection recommendations

- **Basic Tile Value Assessment**: Joker prioritization, flower passing, sequence potential
- **Pattern-Based Recommendations**: 2025 patterns, like numbers, dragon patterns
- **Recommendation Quality**: Confidence scoring, reasoning generation
- **Edge Cases**: Minimal hands, joker-heavy hands, analysis errors
- **Performance**: Large hands, complex patterns, recommendation speed
- **Strategic Intelligence**: Tile synergies, multi-factor analysis

### 5. Charleston Multiplayer Coordination
**File**: `charleston-multiplayer.test.ts`
**Coverage**: Multiplayer Charleston synchronization and coordination

- **Multiplayer Mode Setup**: Room initialization, player assignment
- **Player Readiness Coordination**: Individual/group readiness, partial scenarios
- **Charleston Phase Coordination**: Multi-player phase transitions, completion sync
- **Resilient Service Integration**: Connection handling, operation queuing
- **Tile Exchange Coordination**: Selection, passing, reception between players
- **Error Handling**: Disconnections, network errors, state recovery
- **Performance**: Rapid state changes, many players, concurrent operations

### 6. Charleston Phase Transitions
**File**: `charleston-phase-transitions.test.ts`
**Coverage**: Phase management, transitions, and completion logic

- **Phase Initialization**: Default states, Charleston startup
- **Standard 4-Player Transitions**: Right → Across → Left → Optional → Complete
- **3-Player Transitions**: Right → Left → Optional → Complete (skip Across)
- **Edge Case Player Counts**: 2-player, unusual counts, invalid counts
- **Charleston Completion**: Normal completion, direct ending, state cleanup
- **Manual Phase Setting**: Direct phase changes, validation
- **Error Cases**: Transitions when not active, rapid transitions, post-completion
- **Integration**: Game state coordination, tile management sync
- **Reset & Recovery**: State reset, invalid state recovery

## Test Architecture

### Test Utilities
- **Tile Creation**: `createTestTile()`, `createCharlestonHand()`, type-specific tiles
- **Pattern Creation**: Pattern selection mocks for AI recommendation testing
- **Store Mocking**: Comprehensive store state mocking for integration tests
- **Event Simulation**: Network event simulation for resilient service testing

### Mock Strategy
- **External Dependencies**: Connection services, network handlers, stores
- **UI Components**: Simplified component mocks for integration testing
- **Service Integration**: Mock service responses while testing business logic
- **State Management**: Fresh state retrieval for accurate testing

### Coverage Areas

#### Business Logic Testing
- ✅ Charleston phase progression logic
- ✅ Tile selection and validation rules
- ✅ AI recommendation algorithms
- ✅ Multiplayer coordination protocols
- ✅ Error handling and recovery

#### Integration Testing
- ✅ Charleston ↔ GameModeView integration
- ✅ Store coordination across Charleston components
- ✅ Network resilience service integration
- ✅ UI state management during Charleston

#### Edge Case Testing
- ✅ Boundary conditions (empty hands, max tiles)
- ✅ Invalid inputs (bad player IDs, malformed data)
- ✅ Performance stress testing (many players, rapid changes)
- ✅ Network failure scenarios
- ✅ State consistency validation

#### User Experience Testing
- ✅ Modal interactions (tile input, confirmation)
- ✅ Phase transition feedback
- ✅ Error messaging and recovery
- ✅ Charleston skip functionality
- ✅ Multiplayer vs solo behavior differences

## Running the Tests

```bash
# Run all Charleston tests
npm test charleston

# Run specific test files
npm test charleston-resilient.test.ts
npm test charleston-integration.test.tsx
npm test charleston-ai-recommendations.test.ts

# Run with coverage
npm run test:coverage -- charleston
```

## Test Quality Standards

- **Deterministic**: All tests produce consistent results
- **Isolated**: Tests don't depend on each other or external state
- **Fast**: Test suite completes quickly for rapid feedback
- **Comprehensive**: Covers happy paths, edge cases, and error conditions
- **Maintainable**: Clear test names, good organization, minimal mocking complexity

## Key Business Logic Validated

1. **Charleston Phase Flow**: Proper progression through right/across/left/optional phases
2. **Tile Selection Rules**: Exactly 3 tiles, no jokers, user choice validation
3. **AI Recommendations**: Strategic tile analysis based on patterns and tile value
4. **Multiplayer Coordination**: Player readiness, tile exchange, phase synchronization
5. **Network Resilience**: Connection failure handling, operation queuing, recovery
6. **Game Integration**: Seamless Charleston to gameplay transitions
7. **Error Recovery**: Graceful handling of invalid states and network issues

This comprehensive test suite ensures the Charleston phase works reliably in both solo and multiplayer scenarios, providing users with intelligent co-pilot assistance during this critical game phase.