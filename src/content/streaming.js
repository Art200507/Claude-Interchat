/**
 * streaming.js — retained for cleanup event handling only
 *
 * SSE parsing and Q&A orchestration have moved into overlay.js
 * (each overlay instance manages its own stream and conversation).
 *
 * This file handles the global cleanup event fired when an overlay
 * is dismissed without going through its own destroy() path
 * (edge case: programmatic dismiss from outside the overlay).
 */

// No-op — all logic is self-contained in each overlay instance created by overlay.js.
// Kept as a placeholder so the manifest script list doesn't need to change.
