# Gameplay View Specification (Solo Mode)

This document defines the ideal state for the Game Mode screen (/game) in solo mode.

## Page Layout Structure

### Top Zone
**Visual Layout:**
```
# Game Mode
<player name>'s turn • Playing ## patterns • Next: <player name> • Wall: ## tiles remaining
[Pause Game] [Swap Joker] [Dead Hand]                    [⏱️ 00:45]
```

**Components:**
- **Heading**: "Game Mode" (H1)
- **Turn Indicator**: "<player name>'s turn" (game always starts with East player)
- **Pattern Count**: "Playing ## patterns" (count of primary + alternate patterns with 'play' checkbox selected)
- **Next Player**: "Next: <player name>" (counter-clockwise from current player)
- **Wall Counter**: "Wall: ## tiles remaining"
- **Action Buttons**: Pause Game, Swap Joker, Dead Hand
- **Floating Timer**: Shows elapsed time for current turn (resets to 0 on new turn, pauses when game paused)

### Game Control Panel (Solo Mode Only)
**Purpose**: Manual input controls for simulating other players' actions

**Components:**
- **Log Other Player Discard**: Link to tile input modal → adds tile directly to discard pile → advances turn by 1
- **Log Other Player Call**: Link to tile input modal → adds tiles directly to player exposed tiles
- **Undo Last Turn**: Reverses the last turn action

### Your Hand Zone
**Visual Layout:**
```
# Your Hand
[Concealed Tiles: 🀀🀁🀂🀃🀄...] (13-14 tiles)
[Exposed Groups: 🀀🀀🀀 | 🀁🀁🀁🀁] (if any)

[Draw Tile] (only enabled when appropriate)
```

**Tile Behavior:**
- **Tile Count**: 13 or 14 tiles (14 if East player)
- **Grouping**: Separated into concealed and exposed sections
- **Highlighting**:
  - Green: Tiles matching primary pattern or patterns marked 'play'
  - Red: Tiles recommended for discard
- **Interaction**:
  - Click tile → tile animation → selection panel opens
  - Selection panel shows: [Discard] [Lock/Unlock] [Cancel]
- **Draw Tile Button**: Only enabled at start of player's turn when hand has exactly 13 tiles

### AI Co-Pilot Zone
**Keep Recommendations:**
- List of tiles recommended to keep from Engine 3
- Formatted as colorized pattern visualizer

**Discard Recommendations:**
- List of tiles recommended to discard from Engine 3
- Formatted as colorized pattern visualizer

**Strategy Section:**
- Current strategy explanation
- Defensive strategy notes

### Primary Pattern Container
**Layout:**
```
Primary Pattern: [Pattern Name]
[Colorized Pattern Visualizer]
##/14 tiles (##% complete) • AI Score: ###
[████████░░] Progress Bar

AI Score Breakdown:
• Pattern Completion: ##%
• Pattern Difficulty: ##%
• Strategic Value: ##%
• Total Score: ###
```

### Alternate Pattern Container
**Layout:**
```
Top Alternate Patterns:
□ [Pattern Name + Qualifier] ##/14 (##%) Score: ### [Colorized Visualizer]
□ [Pattern Name + Qualifier] ##/14 (##%) Score: ### [Colorized Visualizer]
□ [Pattern Name + Qualifier] ##/14 (##%) Score: ### [Colorized Visualizer]
...up to 5 patterns

[View All Patterns]
```

**Features:**
- Shows top 5 highest-scoring non-primary patterns
- Each pattern shows: name + qualifier, tile count, completion %, AI score, colorized visualizer
- Checkbox to select pattern for 'play' (includes in pattern count)
- "View All Patterns" button launches expanded modal (only shows patterns with 3+ matches)

### Exposed Tile Zone
**Layout:**
```
Exposed Tiles:
Player 1: 🀀🀀🀀 | 🀁🀁🀁🀁
Player 2: 🀂🀂🀂
Player 3: (none)
Player 4: 🀃🀃🀃 | 🀄🀄🀄🀄
```

**Features:**
- Groups separated by player
- Shows pung/kong/quint sets

### Discard Pile Zone
**Layout:**
```
Discard Pile (## tiles):
Dots: 🀀🀁🀂🀃🀄...
Bams: 🀐🀑🀒🀓🀔...
Cracks: 🀙🀚🀛🀜🀝...
Honors: 🀆🀇🀈🀉🀊🀋🀌🀍🀎🀏

[Call Tile]
```

**Features:**
- Tile sprites organized by suit
- Tiles overlap slightly for space efficiency
- Shows total count of discarded tiles
- "Call Tile" link for claiming discards

## Gameplay Flow

### Turn Sequence (After Discard)
When "Discard" button is clicked:

1. **Turn Advancement**: Current turn advances by 1
2. **Timer Reset**: Timer resets to 0 and begins counting for new player
3. **UI Updates**: Player turn name updates to show new current player
4. **Wall Update**: Wall tile count decreases by 1
5. **Analysis Refresh**: All analysis engines re-run with new game state
6. **Recommendations Update**: Tile and pattern recommendations refresh based on latest analysis
7. **Notifications**: System checks and displays notifications for:
   - Potential joker swap opportunities
   - Call tile opportunities for other players
   - Mahjong declaration opportunities

## Actions Reference

### Game Control Actions
- **Pause Game**: Timer pauses, game state frozen
- **Resume Game**: Timer continues from paused time (does not run in background while paused)
- **Draw Tile**: Opens tile input modal → adds selected tile to player hand
- **Swap Joker**: If exposed set contains joker and player has matching tile → exchange them
- **Dead Hand**: Exclude player from remainder of game

### Tile Actions
- **Discard**: Remove selected tile from hand → add to discard pile → check for call opportunities
- **Lock**: Add padlock badge to tile → prevent discard/pass until unlocked
- **Unlock**: Remove padlock badge → allow normal tile actions
- **Cancel**: Close tile selection panel without action

### Pattern Actions
- **Swap Primary**: When alternate pattern selected → confirmation popup → move to primary position → resort alternates by AI score
- **Call Tile**: Add called tile to hand → mark as exposed with matching tiles → use jokers if needed for complete sets

### Solo Mode Specific
- **Log Other Player Discard**: Manual input for other players' discards
- **Log Other Player Call**: Manual input for other players' calls
- **Undo Last Turn**: Reverse the most recent turn action

## Technical Requirements

### State Management
- Game always starts with East player's turn
- Turn order: East → North → West → South (counter-clockwise)
- Timer state persists through pause/resume cycles
- Analysis engines trigger on state changes
- UI updates propagate immediately after actions

### Visual Requirements
- Responsive design for mobile/desktop
- Smooth tile animations on interaction
- Clear visual hierarchy with proper heading structure
- Colorized pattern visualizers for easy pattern recognition
- Progress bars and percentage indicators for completion tracking

### Interaction Requirements
- Touch-friendly tile selection on mobile
- Immediate visual feedback on all actions
- Confirmation dialogs for destructive actions
- Contextual enabling/disabling of action buttons
- Clear visual distinction between concealed and exposed tiles