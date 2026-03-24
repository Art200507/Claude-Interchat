/**
 * service-worker.js — MV3 service worker (minimal)
 *
 * All API calls happen directly from content scripts (same-origin fetch).
 * The service worker exists to satisfy MV3 requirements and for
 * future extensibility (e.g., badge updates, cross-tab messaging).
 */

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    console.log('[interChat] Installed. Navigate to claude.ai to get started.');
  }
});
