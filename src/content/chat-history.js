/**
 * chat-history.js — rolling summary of the main Claude conversation
 *
 * Watches the DOM for new AI turns via MutationObserver.
 * When a response finishes streaming (2s of silence), compresses the
 * human + AI text and appends it to chrome.storage.session under
 * 'interChat_history' tagged with the current conversation URL path.
 *
 * The overlay reads this when the user turns History ON.
 */

(function () {
  'use strict';

  const STORAGE_KEY   = 'interChat_history';
  const MAX_EXCHANGES = 10;
  const TRIM_LEN      = 110; // chars per turn in the summary

  function compress(txt) {
    const s = (txt || '').replace(/\s+/g, ' ').trim();
    return s.length > TRIM_LEN ? s.slice(0, TRIM_LEN) + '\u2026' : s;
  }

  // Use pathname so query-string variations don't split the same conversation
  function convKey() { return location.pathname; }

  async function appendExchange(humanTxt, aiTxt) {
    let list = [];
    try {
      const r = await chrome.storage.session.get(STORAGE_KEY);
      list = Array.isArray(r[STORAGE_KEY]) ? r[STORAGE_KEY] : [];
    } catch (_) {}

    list.push({ url: convKey(), h: compress(humanTxt), a: compress(aiTxt) });

    // Keep at most MAX_EXCHANGES per conversation (sliding window over full list)
    const byUrl = list.filter(e => e.url === convKey());
    if (byUrl.length > MAX_EXCHANGES) {
      const trim = byUrl.slice(-MAX_EXCHANGES);
      const others = list.filter(e => e.url !== convKey());
      list = [...others, ...trim];
    }

    try { await chrome.storage.session.set({ [STORAGE_KEY]: list }); } catch (_) {}
    console.log('[interChat] history: exchange saved (' + byUrl.length + ' total)');
  }

  // Grab the human message that precedes an AI turn element
  function getHumanText(aiTurnEl) {
    // Most likely structure: ai-turn's previous sibling is the human-turn
    const prev = aiTurnEl.previousElementSibling;
    if (prev) {
      const t = prev.textContent.trim();
      if (t.length > 3) return t;
    }
    // Fallback: last [data-testid="human-turn"] in the page
    const all = document.querySelectorAll('[data-testid="human-turn"]');
    if (all.length) return all[all.length - 1].textContent.trim();
    return '';
  }

  // Tracks which AI-turn elements we've already started observing
  const processed = new WeakSet();

  function trackAITurn(aiTurnEl) {
    if (processed.has(aiTurnEl)) return;
    processed.add(aiTurnEl);

    let timer = null;

    function capture() {
      mo.disconnect();
      const aText = aiTurnEl.textContent.trim();
      if (!aText || aText.length < 10) return;
      const hText = getHumanText(aiTurnEl);
      if (!hText) return;
      appendExchange(hText, aText);
    }

    // Inner observer: watch for streaming mutations, debounce 2s of silence
    const mo = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(capture, 2000);
    });
    mo.observe(aiTurnEl, { childList: true, subtree: true, characterData: true });

    // If element is already fully rendered (e.g., cached SPA navigation), capture after 2s anyway
    timer = setTimeout(capture, 2000);
  }

  // Outer observer: watch for new AI turns added to the DOM
  const outerMO = new MutationObserver(mutations => {
    for (const { addedNodes } of mutations) {
      for (const node of addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches('[data-testid="ai-turn"]')) {
          trackAITurn(node);
        } else {
          node.querySelectorAll?.('[data-testid="ai-turn"]').forEach(trackAITurn);
        }
      }
    }
  });

  outerMO.observe(document.body, { childList: true, subtree: true });

  // Scan turns already on the page (e.g., navigating back to an existing conversation)
  document.querySelectorAll('[data-testid="ai-turn"]').forEach(trackAITurn);

  console.log('[interChat] chat-history observer ready');
})();
