"use strict";
// frontend/src/types/index.ts
// Core type definitions for American Mahjong Web Assistant
// This file serves as the "contract" between all components and sessions
Object.defineProperty(exports, "__esModule", { value: true });
exports.TILE_SUITS = exports.PLAYER_POSITIONS = exports.DEFAULT_GAME_SETTINGS = exports.TILE_COUNTS = void 0;
// ========================================
// CONSTANTS & ENUMS
// ========================================
exports.TILE_COUNTS = {
    numbers: 4, // 4 of each numbered tile (1-9 in each suit)
    winds: 4, // 4 of each wind
    dragons: 4, // 4 of each dragon
    flowers: 1, // 1 of each flower
    jokers: 8 // 8 jokers total
};
exports.DEFAULT_GAME_SETTINGS = {
    enableCharleston: true,
    charlestonTimeLimit: 60,
    turnTimeLimit: 30,
    enableJokers: true,
    enableFlowers: true,
    cardYear: 2025
};
exports.PLAYER_POSITIONS = ['east', 'south', 'west', 'north'];
exports.TILE_SUITS = ['dots', 'bams', 'cracks', 'winds', 'dragons', 'flowers', 'jokers'];
//# sourceMappingURL=game-types.js.map