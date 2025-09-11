"use strict";
// frontend/src/types/socket-events.ts
// Socket Event Schema & Communication Protocol
// This defines the exact event names and data structures for real-time communication
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMMEDIATE_RESPONSE_EVENTS = exports.RATE_LIMITED_EVENTS = void 0;
/*
========================================
EVENT FLOW PATTERNS
========================================
*/
// Real-time game flow:
// 1. player-action -> action-processed -> turn-change
// 2. tile-discarded -> (optional) tile-called -> turn-change
// 3. charleston-selection -> charleston-selection-status -> charleston-phase-complete
// Error handling flow:
// 1. invalid-action -> error -> (client retry or fallback)
// 2. connection issues -> heartbeat failure -> reconnection
// Private data flow:
// 1. update-tiles -> private-tiles-updated (to sender only)
// 2. request-analysis -> analysis-result (to sender only)
/*
========================================
RATE LIMITING & THROTTLING
========================================
*/
// Events that should be rate-limited:
exports.RATE_LIMITED_EVENTS = [
    'update-tiles', // Max 1/second per player
    'request-analysis', // Max 1/2 seconds per player  
    'charleston-selection', // Max 1/500ms per player
    'heartbeat' // Max 1/second per connection
];
// Events that trigger immediate responses:
exports.IMMEDIATE_RESPONSE_EVENTS = [
    'join-room',
    'player-action',
    'call-tile',
    'declare-mahjong'
];
//# sourceMappingURL=socket-events.js.map