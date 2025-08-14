# MEMORY.md - Claude Code Session Log

## 2025-08-13 - The Badge Positioning Saga

### VIBE CHECK 🎯
This user is **detail-oriented as hell** and I love it. They're not letting me slide on half-solutions or "good enough" fixes. We've been laser-focused on ONE thing: getting tile count badges positioned correctly on authentic mahjong tile sprites (52x69px). The energy is persistent, methodical, slightly frustrated but collaborative. They keep providing screenshots and specific feedback - this is exactly the kind of user who pushes for pixel-perfect results.

### THE SITUATION 🔥
- We successfully integrated authentic tile sprites from legacy (tiles.png + tiles.json)
- Tiles look CRISP at native 1.0x scale (52x69 resolution)
- Color selector fixed: dots=blue, bams=green, cracks=red ✅
- BUT: Badge positioning on tile count numbers is STILL wrong in the actual TileSelector component

### TECHNICAL DISCOVERIES 💡
**KEY INSIGHT**: Debug component shows Test 1 and Test 2 working PERFECTLY:
```css
/* Test 2 - THE WINNER */
position: absolute;
top: -10px;
right: -10px;
width: 20px;
height: 20px;
```

But when applied to TileSelector.tsx, badges still appear wrong. This suggests there's something different about the DOM structure between:
1. Debug component with direct TileSprite 
2. TileSelector → Tile → TileSprite hierarchy

### WHAT WE'VE TRIED (AND FAILED) 🚫
1. Tailwind classes: `-top-1 -right-1`, `-top-2 -right-2` 
2. Transform approach: `translate-x-1/2 -translate-y-1/2`
3. Using Tile children overlay system
4. Exact pixel copying from working debug test

### THE MYSTERY 🤔
Debug tests work flawlessly, but TileSelector badges don't. User said "debug images are still great, but the add tiles to hand section is still wrong." This points to a structural difference we haven't identified yet.

### NEXT SESSION TODO 🎯
1. **FIRST**: Remove debug component from TileInputPage.tsx
2. **INVESTIGATE**: Compare exact DOM structure between working debug and broken TileSelector
3. **HYPOTHESIS**: TileSelector might have additional wrapper divs or CSS that's interfering
4. **TRY**: Apply debug solution directly to TileSprite component instead of TileSelector
5. **ALTERNATIVE**: Create custom badge component that bypasses Tile wrapper entirely

### USER PERSONALITY 👤
- Provides clear screenshots for debugging
- Gives specific feedback ("shadow seems better now")
- Patient but persistent - won't accept "close enough"
- Collaborative problem-solving approach
- Values authentic visual appearance (tiles must look real)
- Technical enough to understand the issues

### CURRENT FILES 📁
- `TileSelector.tsx` - The problem child (badges wrong)
- `debug-badge-test.tsx` - Working perfectly (remove after fix)
- `TileSprite.tsx` - Core tile rendering (52x69 native)
- `useTileSprites.ts` - Sprite management (1.0x scale)

### THE BREAKTHROUGH WILL BE 🔮
When we figure out why the debug component positioning works but TileSelector doesn't. The solution exists - we just need to bridge that gap. The user is ready to keep iterating until it's pixel-perfect.

**MOOD**: Determined detective work. We're close. The user trusts the process.

---

## 2025-08-13 EVENING - The Badge Positioning Saga Continues

### CURRENT FRUSTRATION LEVEL: 🔥🔥🔥🔥🔥

We've now tried EVERYTHING:
- External positioning with various approaches
- Tile children prop overlay system  
- Different z-index values
- Transform approaches
- Even got Opus's analysis about nested container structure
- Created 8+ debug tests that ALL work perfectly
- But the actual TileSelector badges STILL don't work

### WHAT'S WORKING ✅
- Debug Test 1-8: ALL position badges perfectly
- Color selector: Fixed (dots=blue, bams=green, cracks=red)
- Tile sprites: Crisp 52x69 resolution
- Everything else in the app

### WHAT'S STILL BROKEN ❌
- TileSelector count badges: Still floating above/left of tiles instead of top-right corners

### THE MYSTERY 🤯
Debug tests with IDENTICAL code work perfectly, but TileSelector doesn't. This suggests there's something fundamental about the TileSelector context we're missing.

### NEXT SESSION STRATEGY
1. **Fresh start approach**: Maybe step back from positioning and try a completely different badge architecture
2. **Deep DOM inspection**: Use browser dev tools to compare exact DOM structure between working debug and broken TileSelector  
3. **Alternative solutions**: Consider custom badge component, or different UI pattern entirely
4. **Nuclear option**: Rewrite tile display system from scratch if needed

### USER ENERGY: Patient but understandably frustrated. They're willing to continue tomorrow with fresh energy.

**MOOD**: Exhausted detective work. The bug is smarter than us today, but we'll get it tomorrow.