"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMMEDIATE_RESPONSE_EVENTS = exports.RATE_LIMITED_EVENTS = void 0;
// Rate limiting constants
exports.RATE_LIMITED_EVENTS = [
    'update-tiles', // Max 1/second per player
    'request-analysis', // Max 1/2 seconds per player  
    'charleston-selection', // Max 1/500ms per player
    'heartbeat' // Max 1/second per connection
];
exports.IMMEDIATE_RESPONSE_EVENTS = [
    'join-room',
    'player-action',
    'call-tile',
    'declare-mahjong'
];
//# sourceMappingURL=socket-event-types.js.map