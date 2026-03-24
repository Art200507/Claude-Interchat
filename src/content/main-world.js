/**
 * main-world.js — runs in MAIN world (document_start)
 *
 * Monkey-patches window.fetch before Claude's React app loads.
 * Extracts orgId and apiBase from outgoing API calls, then
 * posts them to the ISOLATED world via window.postMessage.
 *
 * This file MUST NOT import anything or use chrome.* APIs —
 * it runs in the page's JS context, not the extension context.
 */

(function () {
  const _originalFetch = window.fetch;

  console.log('[interChat] main-world fetch interceptor installed');

  window.fetch = function (resource, init) {
    const url = typeof resource === 'string' ? resource : (resource && resource.url) || '';

    if (url.includes('claude.ai') && url.includes('/api/')) {
      // Extract orgId from URLs like /api/organizations/{orgId}/...
      const orgMatch = url.match(/\/api\/organizations\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (orgMatch && orgMatch[1]) {
        window.postMessage({
          source: 'interchat-main',
          type: 'INTERCHAT_ORG_DISCOVERED',
          orgId: orgMatch[1],
        }, '*');
      }

      // Extract the API base (scheme + host + /api)
      const apiBaseMatch = url.match(/(https:\/\/[^/]+\/api)/);
      if (apiBaseMatch && apiBaseMatch[1]) {
        window.postMessage({
          source: 'interchat-main',
          type: 'INTERCHAT_API_BASE',
          apiBase: apiBaseMatch[1],
        }, '*');
      }
    }

    return _originalFetch.apply(this, arguments);
  };
})();
