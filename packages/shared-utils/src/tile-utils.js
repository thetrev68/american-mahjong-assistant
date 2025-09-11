"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortTiles = exports.getMaxTilesForPosition = exports.validateTileCollection = exports.getSuitDisplayName = exports.removeTile = exports.addTile = exports.canSelectTile = exports.countTiles = exports.groupTilesBySuit = exports.createAllTiles = exports.validatePositionTileCount = exports.getTargetTileCount = void 0;
// Mock these functions for now since dealer-logic doesn't exist
const getTargetTileCount = (_position) => 14;
exports.getTargetTileCount = getTargetTileCount;
const validatePositionTileCount = (_position, count) => count === 14;
exports.validatePositionTileCount = validatePositionTileCount;
// Create all available tiles for selection
const createAllTiles = () => {
    const tiles = [];
    // Dots (1D-9D)
    for (let i = 1; i <= 9; i++) {
        tiles.push({
            id: `${i}D`,
            suit: 'dots',
            value: i.toString()
        });
    }
    // Bams (1B-9B)
    for (let i = 1; i <= 9; i++) {
        tiles.push({
            id: `${i}B`,
            suit: 'bams',
            value: i.toString()
        });
    }
    // Cracks (1C-9C)
    for (let i = 1; i <= 9; i++) {
        tiles.push({
            id: `${i}C`,
            suit: 'cracks',
            value: i.toString()
        });
    }
    // Winds
    tiles.push({ id: 'east', suit: 'winds', value: 'east' }, { id: 'south', suit: 'winds', value: 'south' }, { id: 'west', suit: 'winds', value: 'west' }, { id: 'north', suit: 'winds', value: 'north' });
    // Dragons
    tiles.push({ id: 'red', suit: 'dragons', value: 'red' }, { id: 'green', suit: 'dragons', value: 'green' }, { id: 'white', suit: 'dragons', value: 'white' });
    // Flowers
    tiles.push({ id: 'f1', suit: 'flowers', value: 'f1' }, { id: 'f2', suit: 'flowers', value: 'f2' }, { id: 'f3', suit: 'flowers', value: 'f3' }, { id: 'f4', suit: 'flowers', value: 'f4' });
    // Jokers
    tiles.push({ id: 'joker', suit: 'jokers', value: 'joker' });
    return tiles;
};
exports.createAllTiles = createAllTiles;
// Group tiles by suit for organized display
const groupTilesBySuit = (tiles) => {
    const grouped = {
        dots: [],
        bams: [],
        cracks: [],
        winds: [],
        dragons: [],
        flowers: [],
        jokers: []
    };
    tiles.forEach(tile => {
        grouped[tile.suit].push(tile);
    });
    // Sort numerical tiles within each suit
    ['dots', 'bams', 'cracks'].forEach(suit => {
        grouped[suit].sort((a, b) => parseInt(String(a.value)) - parseInt(String(b.value)));
    });
    return grouped;
};
exports.groupTilesBySuit = groupTilesBySuit;
// Count occurrences of each tile in a collection
const countTiles = (tiles) => {
    const counts = {};
    tiles.forEach(tile => {
        counts[tile.id] = (counts[tile.id] || 0) + 1;
    });
    return counts;
};
exports.countTiles = countTiles;
// Check if a tile can be selected (not exceeding max count)
const canSelectTile = (tile, currentTiles, maxCount = 4) => {
    const currentCount = currentTiles.filter(t => t.id === tile.id).length;
    return currentCount < maxCount;
};
exports.canSelectTile = canSelectTile;
// Add a tile to collection
const addTile = (tiles, newTile) => {
    if ((0, exports.canSelectTile)(newTile, tiles)) {
        return [...tiles, { ...newTile }];
    }
    return tiles;
};
exports.addTile = addTile;
// Remove one instance of a tile from collection
const removeTile = (tiles, tileToRemove) => {
    const index = tiles.findIndex(t => t.id === tileToRemove.id);
    if (index !== -1) {
        const newTiles = [...tiles];
        newTiles.splice(index, 1);
        return newTiles;
    }
    return tiles;
};
exports.removeTile = removeTile;
// Get display name for suits
const getSuitDisplayName = (suit) => {
    const displayNames = {
        dots: 'Dots',
        bams: 'Bams',
        cracks: 'Cracks',
        winds: 'Winds',
        dragons: 'Dragons',
        flowers: 'Flowers',
        jokers: 'Jokers'
    };
    return displayNames[suit];
};
exports.getSuitDisplayName = getSuitDisplayName;
// UPDATED: Validate a tile collection with optional position-aware logic
const validateTileCollection = (tiles, playerPosition) => {
    const errors = [];
    const warnings = [];
    const counts = (0, exports.countTiles)(tiles);
    // Check for too many of any tile type
    Object.entries(counts).forEach(([tileId, count]) => {
        const maxAllowed = tileId === 'joker' ? 8 : 4;
        if (count > maxAllowed) {
            errors.push(`Too many ${tileId} tiles: ${count} (max: ${maxAllowed})`);
        }
    });
    // Position-aware tile count validation
    if (playerPosition) {
        const isValid = (0, exports.validatePositionTileCount)(playerPosition, tiles.length);
        if (!isValid) {
            errors.push(`Invalid tile count for position ${playerPosition}: ${tiles.length}`);
        }
    }
    else {
        // Original logic for backward compatibility (assumes 13 tiles)
        if (tiles.length > 14) {
            errors.push(`Too many tiles total: ${tiles.length} (max: 14)`);
        }
    }
    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};
exports.validateTileCollection = validateTileCollection;
// NEW: Get appropriate max tiles for HandTileGrid based on position
const getMaxTilesForPosition = (position) => {
    if (!position) {
        return 14; // Default for backward compatibility
    }
    return (0, exports.getTargetTileCount)(position) + 1; // Allow one extra during input
};
exports.getMaxTilesForPosition = getMaxTilesForPosition;
// Sort tiles for consistent display
const sortTiles = (tiles) => {
    const suitOrder = ['dots', 'bams', 'cracks', 'winds', 'dragons', 'flowers', 'jokers'];
    return [...tiles].sort((a, b) => {
        // First sort by suit
        const suitA = suitOrder.indexOf(a.suit);
        const suitB = suitOrder.indexOf(b.suit);
        if (suitA !== suitB) {
            return suitA - suitB;
        }
        // Then sort by value within suit
        if (['dots', 'bams', 'cracks'].includes(a.suit)) {
            return parseInt(String(a.value)) - parseInt(String(b.value));
        }
        // For non-numerical tiles, sort alphabetically
        return String(a.value).localeCompare(String(b.value));
    });
};
exports.sortTiles = sortTiles;
//# sourceMappingURL=tile-utils.js.map