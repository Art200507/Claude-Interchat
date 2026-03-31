/**
 * isolated-world.js — loaded first in the ISOLATED world script list
 *
 * Establishes the shared state object that all other modules read from.
 * Listens for postMessage events from main-world.js (MAIN world) to
 * populate orgId and apiBase as soon as Claude's page makes any API call.
 *
 * Falls back to explicitly fetching /api/organizations if the monkey-patch
 * missed the initial page load (e.g., cached SPA navigation).
 */

window.__interChat = {
  orgId: null,
  apiBase: null,
  activeConversationId: null,
  overlayTexts: new Set(),
};

console.log('[interChat] isolated-world loaded');

// Receive discoveries from main-world.js
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== 'interchat-main') return;

  if (data.type === 'INTERCHAT_ORG_DISCOVERED' && data.orgId && !window.__interChat.orgId) {
    window.__interChat.orgId = data.orgId;
    console.log('[interChat] orgId set:', data.orgId);
  }
  if (data.type === 'INTERCHAT_API_BASE' && data.apiBase && !window.__interChat.apiBase) {
    window.__interChat.apiBase = data.apiBase;
    console.log('[interChat] apiBase:', data.apiBase);
  }
});

// Fallback: explicitly fetch /api/organizations if postMessage hasn't fired yet.
// Runs after 1.5s to give the monkey-patch first shot.
setTimeout(async () => {
  if (window.__interChat.orgId) return; // already populated
  try {
    const res = await fetch('https://claude.ai/api/organizations', { credentials: 'include' });
    if (!res.ok) return;
    const orgs = await res.json();
    if (Array.isArray(orgs) && orgs[0]?.uuid) {
      window.__interChat.orgId = orgs[0].uuid;
      window.__interChat.apiBase = 'https://claude.ai/api';
      console.log('[interChat] orgId from fallback fetch:', orgs[0].uuid);
    }
  } catch (_) {
    // Session may not be ready; will retry on first overlay open
  }
}, 1500);
