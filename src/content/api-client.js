/**
 * api-client.js — all fetch calls to Claude's internal API
 *
 * Reads orgId and apiBase from window.__interChat (populated by isolated-world.js).
 * Browser auto-attaches session cookies because these fetch calls are same-origin
 * (content script on https://claude.ai).
 *
 * Three operations:
 *   createConversation() → conversationId (stored in window.__interChat)
 *   sendMessage(opts)    → raw Response (SSE stream)
 *   deleteConversation() → void (best-effort)
 */
 
const ApiClient = (() => {
  function getBase() {
    return window.__interChat.apiBase || 'https://claude.ai/api';
  }

  async function ensureOrgId() {
    if (window.__interChat.orgId) return window.__interChat.orgId;

    // Last-resort discovery if postMessage / timeout fallback haven't fired yet
    const res = await fetch('https://claude.ai/api/organizations', { credentials: 'include' });
    if (!res.ok) throw new Error(`Cannot discover orgId: ${res.status}`);
    const orgs = await res.json();
    if (!Array.isArray(orgs) || !orgs[0]?.uuid) throw new Error('No organization found in session');
    window.__interChat.orgId = orgs[0].uuid;
    window.__interChat.apiBase = 'https://claude.ai/api';
    return window.__interChat.orgId;
  }

  async function createConversation() {
    const orgId = await ensureOrgId();
    const base = getBase();
    const uuid = crypto.randomUUID();

    const res = await fetch(`${base}/organizations/${orgId}/chat_conversations`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', uuid }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`createConversation ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    const convId = data.uuid || uuid;
    window.__interChat.activeConversationId = convId;
    return convId;
  }

  async function sendMessage({ conversationId, question, contextText, historySummary }) {
    const orgId = await ensureOrgId();
    const base = getBase();

    // Prepend rolling history summary if user opted in (History: ON toggle)
    const historyPrefix = historySummary
      ? `Context from the ongoing conversation:\n${historySummary}\n\n`
      : '';

    // Build a prompt that gives Claude context about what text the user selected
    const fullPrompt = contextText
      ? `${historyPrefix}I'm reading a Claude response and selected this text:\n\n"${contextText}"\n\nMy question: ${question}\n\nPlease keep your response concise — 100-120 words maximum; unless the user(me) demands more`
      : `${historyPrefix}${question}\n\nPlease keep your response concise — 100 words maximum, extend if user (me) says`;

    const res = await fetch(
      `${base}/organizations/${orgId}/chat_conversations/${conversationId}/completion`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          attachments: [],
          files: [],
          // rendering_mode and other fields intentionally omitted;
          // Claude's API accepts minimal payloads from the browser.
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`sendMessage ${res.status}: ${body.slice(0, 200)}`);
    }

    return res; // Caller reads the SSE stream from res.body
  }

  async function deleteConversation(conversationId) {
    if (!conversationId) return;
    const orgId = window.__interChat.orgId;
    const base = getBase();
    if (!orgId) return;

    fetch(`${base}/organizations/${orgId}/chat_conversations/${conversationId}`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => {}); // fire-and-forget, best effort
  }

  return { createConversation, sendMessage, deleteConversation };
})();
