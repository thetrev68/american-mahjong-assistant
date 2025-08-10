📋 NMJL 2025 Card Integration Plan

  🔍 Phase 1: Data Integration & Type Safety ⭐ Priority 1

  1.1 Create Type Definitions

  - Define TypeScript interfaces matching your JSON structure:
    - NMJL2025Pattern, PatternGroup, ConstraintType, SuitRole
  - Add enum types for constraint values and suit roles
  - Ensure compatibility with existing HandPattern type

  1.2 Pattern Data Loader

  - Create nmjl-card-loader.ts utility to load and validate JSON data
  - Add pattern indexing by ID, points, difficulty, and suit combinations
  - Create lookup tables for fast pattern matching

  🎯 Phase 2: Core Engine Upgrades ⭐ Priority 1

  2.1 Update NMJLPatternAnalyzer

  - Replace mock/hardcoded patterns with real 2025 card data
  - Implement constraint evaluation for each group type:
    - Sequences (e.g., "2,0,2,5" with zero_is_neutral)
    - Pungs/Kongs with value constraints
    - Flower groups with specific constraints
    - Cross-matching groups (Constraint_Must_Match)

  2.2 Enhanced Pattern Matching Logic

  - Implement suit role logic (first, second, third, any, none)
  - Add constraint matching for Constraint_Values parsing
  - Handle special cases like zero_is_neutral, joker restrictions
  - Add pattern difficulty scoring and probability calculations

  🔄 Phase 3: Charleston Intelligence ⭐ Priority 1

  3.1 Charleston Recommendation Engine

  - Analyze which patterns are achievable with current tiles
  - Calculate tile value for each pattern based on:
    - Pattern points (25, 30, 35, etc.)
    - Completion probability with current hand
    - Required tiles still needed
  - Recommend tiles to pass based on pattern optimization

  3.2 Strategic Charleston Logic

  - Keep tiles that are essential for high-probability patterns
  - Pass tiles that don't contribute to viable patterns
  - Consider opponent analysis - don't pass tiles useful to others
  - Phase-specific strategy (right/across/left/optional differences)

  📊 Phase 4: Advanced Hand Analysis ⭐ Priority 2

  4.1 Real-Time Pattern Recognition

  - Match current hand against all 71 patterns simultaneously
  - Score each pattern by completion percentage
  - Show multiple viable pattern paths with probability scores
  - Update analysis as tiles change during Charleston/gameplay

  4.2 Strategic Recommendations

  - Tile priority scoring: Which tiles to pick up from discards
  - Discard optimization: Which tiles to discard to maintain pattern viability
  - Exposure timing: When to call pung/kong vs. staying concealed
  - Mahjong detection: Real-time winning hand recognition

  🔧 Phase 5: User Experience Enhancements ⭐ Priority 2

  5.1 Pattern Display

  - Show matched patterns with visual hand layouts
  - Display pattern descriptions and point values
  - Highlight which tiles complete each pattern
  - Show joker usage possibilities per pattern

  5.2 Advanced Features

  - Pattern search: Find patterns by points, difficulty, or tile requirements
  - "What if" analysis: Show how hand changes affect pattern viability
  - Learning mode: Explain why certain tiles are recommended
  - Statistical tracking: Pattern success rates over multiple games

  🚀 Implementation Priority & Timeline

  🔴 Critical (Week 1-2)

  1. Data loader and type definitions - Foundation for everything
  2. Pattern matching core logic - Essential for accurate analysis
  3. Charleston engine integration - Immediate user value improvement

  🟡 High Priority (Week 3-4)

  4. Real-time hand analysis upgrades - Better game recommendations
  5. Enhanced UI pattern display - Show users what patterns are possible
  6. Strategic discard recommendations - Gameplay improvement

  🟢 Enhancement (Week 5+)

  7. Advanced features - Pattern search, learning mode, statistics
  8. Performance optimization - Fast pattern matching for real-time use
  9. Testing and refinement - Ensure accuracy with real gameplay

  ---
  🎯 Expected Impact:
  - Charleston recommendations accuracy: From ~60% to ~95%
  - Pattern recognition: From basic to complete NMJL 2025 coverage
  - Strategic depth: From simple tile counting to advanced pattern probability analysis
  - User experience: From generic advice to specific, actionable recommendations