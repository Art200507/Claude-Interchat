/**
 * overlay.js — floating overlay panels for interChat
 */

(function () {
  'use strict';

  const W = 390;
  const OFFSET_Y = 14;
  const overlayStack = [];

  // ── Thread SVG layer ─────────────────────────────────────────────────
  let _svg = null;
  function getSVG() {
    if (_svg && _svg.isConnected) return _svg;
    _svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    Object.assign(_svg.style, {
      position: 'fixed', top: '0', left: '0',
      width: '100vw', height: '100vh',
      pointerEvents: 'none',
      zIndex: '2147483644',
      overflow: 'visible',
    });
    document.body.appendChild(_svg);
    return _svg;
  }

  // ── CSS Custom Highlight ─────────────────────────────────────────────
  let _hl = null;
  function getHL() {
    if (_hl) return _hl;
    try {
      if (!CSS.highlights || typeof Highlight === 'undefined') return null;
      const s = document.createElement('style');
      s.textContent = '::highlight(interchat){background-color:rgba(249,115,22,.35);color:inherit}';
      document.head.appendChild(s);
      _hl = new Highlight();
      CSS.highlights.set('interchat', _hl);
    } catch (_) {}
    return _hl;
  }

  // Collapsed overlay highlight — more opaque orange to signal "minimised"
  let _hlCollapsed = null;
  function getHLCollapsed() {
    if (_hlCollapsed) return _hlCollapsed;
    try {
      if (!CSS.highlights || typeof Highlight === 'undefined') return null;
      const s = document.createElement('style');
      s.textContent = '::highlight(interchat-collapsed){background-color:rgba(249,115,22,.7);color:inherit;cursor:pointer}';
      document.head.appendChild(s);
      _hlCollapsed = new Highlight();
      CSS.highlights.set('interchat-collapsed', _hlCollapsed);
    } catch (_) {}
    return _hlCollapsed;
  }

  // ── Inline CSS — always dark/black + orange ──────────────────────────
  function makeCSS() {
    return `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

.ic{
  background:#111111;
  border:1px solid #2a2a2a;
  border-radius:14px;
  box-shadow:0 16px 48px rgba(0,0,0,.85),0 0 0 1px rgba(249,115,22,.15);
  font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;
  font-size:14px;
  color:#e8e8e8;
  display:flex;
  flex-direction:column;
  overflow:hidden;
  pointer-events:all;
  position:relative;
}

.ic-head{
  display:flex;align-items:center;justify-content:space-between;
  padding:9px 11px 9px 15px;
  border-bottom:1px solid #2a2a2a;
  cursor:grab;user-select:none;flex-shrink:0;
  background:#111111;
}
.ic-head:active{cursor:grabbing}
.ic-brand{font-size:11px;font-weight:800;color:#f97316;letter-spacing:.07em;text-transform:uppercase}
.ic-head-right{display:flex;align-items:center;gap:6px}
.ic-hist-btn{
  background:transparent;border:1px solid #333;color:#555;
  font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;
  border-radius:4px;padding:2px 7px;cursor:pointer;
  transition:all .15s;font-family:inherit;line-height:1.6;
}
.ic-hist-btn:hover{border-color:#555;color:#888}
.ic-hist-btn.on{border-color:#f97316;color:#f97316;background:rgba(249,115,22,.1)}
.ic-close{
  background:transparent;border:none;color:#666;
  font-size:16px;cursor:pointer;padding:2px 7px;border-radius:6px;line-height:1;
  transition:color .1s,background .1s;
}
.ic-close:hover{color:#e8e8e8;background:#1a1a1a}

.ic-ctx{
  margin:11px 13px 0;background:#1c1007;
  border:1px solid #431407;border-radius:8px;padding:8px 11px;flex-shrink:0;
}
.ic-ctx-lbl{
  display:block;font-size:10px;font-weight:700;
  text-transform:uppercase;letter-spacing:.08em;color:#f97316;margin-bottom:3px;
}
.ic-ctx-txt{
  font-size:12.5px;color:#fb923c;font-style:italic;line-height:1.45;
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;
}

.ic-msgs{
  flex:1;min-height:52px;max-height:360px;overflow-y:auto;
  margin:10px 13px;
  display:flex;flex-direction:column;gap:10px;
  scrollbar-width:thin;scrollbar-color:#2a2a2a transparent;
}
.ic-msgs::-webkit-scrollbar{width:3px}
.ic-msgs::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:3px}
.ic-empty{color:#666;font-style:italic;font-size:13px}
.ic-err{color:#f87171;font-size:13px}
.ic-exchange{display:flex;flex-direction:column;gap:4px}
.ic-exchange+.ic-exchange{border-top:1px solid #2a2a2a;padding-top:10px}
.ic-msg-q{font-size:12px;font-weight:600;color:#f97316}
.ic-msg-a{font-size:14px;line-height:1.75;color:#e8e8e8;word-break:break-word}
.ic-msg-a p{margin:0 0 6px}
.ic-msg-a p:last-child,.ic-msg-a>:last-child{margin-bottom:0}
.ic-msg-a h1,.ic-msg-a h2,.ic-msg-a h3{font-weight:700;margin:8px 0 3px;color:#fff}
.ic-msg-a h1{font-size:16px}.ic-msg-a h2{font-size:15px}.ic-msg-a h3{font-size:14px}
.ic-msg-a strong{font-weight:700;color:#fff}
.ic-msg-a em{font-style:italic}
.ic-msg-a ul,.ic-msg-a ol{margin:0 0 6px;padding-left:18px}
.ic-msg-a li{margin:2px 0}
.ic-msg-a code{background:#1e1e1e;border:1px solid #333;border-radius:3px;padding:1px 4px;font-family:monospace;font-size:12.5px;color:#fb923c}
.ic-msg-a pre{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:6px;padding:8px 10px;overflow-x:auto;margin:4px 0}
.ic-msg-a pre code{background:transparent;border:none;padding:0;color:#e8e8e8;font-size:13px}
.ic-msg-a table{border-collapse:collapse;width:100%;margin:4px 0;font-size:13px}
.ic-msg-a th{background:#1c1007;color:#f97316;padding:5px 10px;text-align:left;font-weight:600;border:1px solid #431407}
.ic-msg-a td{padding:5px 10px;border:1px solid #2a2a2a;color:#e8e8e8}
.ic-msg-a tr:nth-child(even) td{background:#161616}

.ic-row{
  display:flex;gap:7px;align-items:flex-end;
  padding:9px 12px 12px;border-top:1px solid #2a2a2a;flex-shrink:0;
}
.ic-input{
  flex:1;background:#1a1a1a;border:1px solid #2a2a2a;
  border-radius:9px;color:#e8e8e8;font-size:14px;font-family:inherit;
  line-height:1.5;padding:8px 11px;resize:none;
  min-height:37px;max-height:110px;
  outline:none;transition:border-color .15s;overflow-y:auto;
}
.ic-input:focus{border-color:#f97316}
.ic-input::placeholder{color:#666}

.ic-send{
  flex-shrink:0;background:#f97316;color:#fff;border:none;
  border-radius:9px;padding:0 15px;height:37px;
  font-size:13px;font-weight:700;font-family:inherit;
  cursor:pointer;transition:background .15s,opacity .15s;white-space:nowrap;
}
.ic-send:hover:not(:disabled){background:#ea580c}
.ic-send:disabled{opacity:.35;cursor:default}

.ic-dots{display:inline-flex;gap:5px;align-items:center;padding:4px 0}
.ic-dots span{
  width:6px;height:6px;background:#f97316;border-radius:50%;display:inline-block;
  animation:icb 1.2s ease-in-out infinite;
}
.ic-dots span:nth-child(2){animation-delay:.2s}
.ic-dots span:nth-child(3){animation-delay:.4s}
@keyframes icb{
  0%,80%,100%{transform:scale(.55);opacity:.35}
  40%{transform:scale(1);opacity:1}
}
.ic--sized .ic-msgs{max-height:none}
.ic-resize{
  position:absolute;right:0;bottom:0;
  width:16px;height:16px;
  cursor:nwse-resize;
  display:flex;align-items:flex-end;justify-content:flex-end;
  padding:3px;z-index:1;
}
.ic-resize::after{
  content:'';display:block;
  width:7px;height:7px;
  border-right:2px solid #444;
  border-bottom:2px solid #444;
}
.ic-resize:hover::after{border-color:#f97316}`;
  }

  // ── SSE parser ───────────────────────────────────────────────────────
  async function parseSSE(stream, { onToken, onDone }) {
    const reader = stream.getReader();
    const dec = new TextDecoder();
    let buf = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop();
        for (const evt of parts) {
          const dl = evt.split('\n').find(l => l.startsWith('data: '));
          if (!dl) continue;
          const raw = dl.slice(6).trim();
          if (!raw || raw === '[DONE]') continue;
          let p;
          try { p = JSON.parse(raw); } catch { continue; }
          const tok = p?.delta?.text || p?.completion || p?.delta?.completion || null;
          if (tok) onToken(tok);
          if (p?.type === 'message_stop' ||
              p?.stop_reason === 'stop_sequence' ||
              p?.stop_reason === 'end_turn') {
            onDone(); return;
          }
        }
      }
    } catch (e) {
      console.error('[interChat] SSE parse error:', e);
    } finally {
      try { reader.releaseLock(); } catch (_) {}
    }
    onDone();
  }

  // ── Markdown renderer ────────────────────────────────────────────────
  function markdownToHtml(md) {
    const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    function inl(s) {
      return esc(s)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g,    '<strong>$1</strong>')
        .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
        .replace(/_([^_\n]+?)_/g,  '<em>$1</em>')
        .replace(/`([^`\n]+?)`/g, '<code>$1</code>');
    }
    const lines = md.split('\n');
    let out = '';
    let i = 0;
    while (i < lines.length) {
      const ln = lines[i];
      // Code block
      if (ln.startsWith('```')) {
        let code = '';
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) { code += (code?'\n':'') + lines[i++]; }
        out += `<pre><code>${esc(code)}</code></pre>`; i++; continue;
      }
      // Table (lookahead for separator row)
      if (/^\|/.test(ln) && i+1 < lines.length && /^\|[\s\-:|]+\|/.test(lines[i+1])) {
        const hdrs = ln.replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
        let t = '<thead><tr>'+hdrs.map(h=>`<th>${inl(h)}</th>`).join('')+'</tr></thead><tbody>';
        i += 2;
        while (i < lines.length && /^\|/.test(lines[i])) {
          const cells = lines[i].replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
          t += '<tr>'+cells.map(c=>`<td>${inl(c)}</td>`).join('')+'</tr>'; i++;
        }
        out += `<table>${t}</tbody></table>`; continue;
      }
      // Heading
      const hm = ln.match(/^(#{1,3})\s+(.+)/);
      if (hm) { out += `<h${hm[1].length}>${inl(hm[2])}</h${hm[1].length}>`; i++; continue; }
      // Unordered list
      if (/^[-*]\s/.test(ln)) {
        let items = '';
        while (i < lines.length && /^[-*]\s/.test(lines[i])) {
          items += `<li>${inl(lines[i].replace(/^[-*]\s+/,''))}</li>`; i++;
        }
        out += `<ul>${items}</ul>`; continue;
      }
      // Ordered list
      if (/^\d+\.\s/.test(ln)) {
        let items = '';
        while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
          items += `<li>${inl(lines[i].replace(/^\d+\.\s+/,''))}</li>`; i++;
        }
        out += `<ol>${items}</ol>`; continue;
      }
      // Blank line
      if (!ln.trim()) { i++; continue; }
      // Paragraph (join consecutive plain lines)
      let para = ln; i++;
      while (i < lines.length && lines[i].trim() &&
             !/^[#|`]/.test(lines[i]) && !/^[-*]\s/.test(lines[i]) && !/^\d+\.\s/.test(lines[i])) {
        para += ' ' + lines[i++];
      }
      out += `<p>${inl(para)}</p>`;
    }
    return out || `<p>${esc(md)}</p>`;
  }

  // ── Factory ──────────────────────────────────────────────────────────
  function createOverlay({ text, range }) {
    console.log('[interChat] createOverlay called, text:', text?.slice(0, 30));
    try {
      _createOverlay({ text, range });
    } catch (e) {
      console.error('[interChat] createOverlay error:', e);
    }
  }

  function _createOverlay({ text, range }) {
    window.__interChat.overlayTexts?.add(text);
    const overlayName = 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
      + (1 + Math.floor(Math.random() * 9));
    let convId = null;
    let busy = false;
    let posX = 0, posY = 0;
    let dragging = false, dragOX = 0, dragOY = 0;
    let userDragged = false;
    let cardW = W, cardH = null;
    let resizeStartX = 0, resizeStartY = 0, resizeStartW = 0, resizeStartH = 0;
    let collapsed = false;
    let justDragged = false;

    // ── Host ────────────────────────────────────────────────────────────
    const host = document.createElement('div');
    host.setAttribute('data-interchat-overlay', '');
    host.setAttribute('data-interchat-name', overlayName);
    Object.assign(host.style, {
      position: 'fixed',
      zIndex: '2147483646',
      pointerEvents: 'none',
      top: '0', left: '0',
    });
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'closed' });

    const styleEl = document.createElement('style');
    styleEl.textContent = makeCSS();
    shadow.appendChild(styleEl);

    // ── Card ─────────────────────────────────────────────────────────────
    const card = document.createElement('div');
    card.className = 'ic';
    card.style.background = '#111111'; // inline fallback
    card.innerHTML = `
      <div class="ic-head">
        <span class="ic-brand">${overlayName}</span>
        <div class="ic-head-right">
          <button class="ic-hist-btn" aria-label="Toggle chat history">History: OFF</button>
          <button class="ic-close" aria-label="Close">&#x2715;</button>
        </div>
      </div>
      <div class="ic-ctx">
        <span class="ic-ctx-lbl">Selected text</span>
        <div class="ic-ctx-txt"></div>
      </div>
      <div class="ic-msgs"><div class="ic-empty">Ask anything about the selected text\u2026</div></div>
      <div class="ic-row">
        <textarea class="ic-input" rows="1" placeholder="Ask a follow-up\u2026"></textarea>
        <button class="ic-send">Send</button>
      </div>`;
    shadow.appendChild(card);

    card.style.width = cardW + 'px';
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'ic-resize';
    card.appendChild(resizeHandle);

    card.querySelector('.ic-ctx-txt').textContent = text;
    const msgsEl   = card.querySelector('.ic-msgs');
    const inputEl  = card.querySelector('.ic-input');
    const sendBtn  = card.querySelector('.ic-send');
    const closeBtn = card.querySelector('.ic-close');
    const headEl   = card.querySelector('.ic-head');
    const histBtn  = card.querySelector('.ic-hist-btn');

    let historyEnabled = false;
    histBtn.addEventListener('click', e => {
      e.stopPropagation(); // don't trigger drag
      historyEnabled = !historyEnabled;
      histBtn.textContent = `History: ${historyEnabled ? 'ON' : 'OFF'}`;
      histBtn.classList.toggle('on', historyEnabled);
    });

    // ── Thread ───────────────────────────────────────────────────────────
    const svgLayer = getSVG();
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('stroke', '#f97316');
    line.setAttribute('stroke-width', '1.5');
    line.setAttribute('stroke-dasharray', '5 4');
    line.setAttribute('opacity', '0.65');
    svgLayer.appendChild(line);

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('r', '3.5');
    dot.setAttribute('fill', '#f97316');
    dot.setAttribute('opacity', '0.85');
    svgLayer.appendChild(dot);

    // ── Highlight ────────────────────────────────────────────────────────
    if (range) { try { getHL()?.add(range); } catch (_) {} }

    // ── Positioning ──────────────────────────────────────────────────────
    function updateThread() {
      if (!range) return;
      try {
        if (!svgLayer.isConnected) document.body.appendChild(svgLayer);
        const r = range.getBoundingClientRect();
        if (!r || r.width + r.height === 0) return;
        const ax = r.left + r.width / 2;
        const ay = r.top  + r.height / 2;
        const cx = posX + cardW / 2;
        const cy = posY;
        line.setAttribute('x1', String(ax)); line.setAttribute('y1', String(ay));
        line.setAttribute('x2', String(cx)); line.setAttribute('y2', String(cy));
        dot.setAttribute('cx', String(ax));  dot.setAttribute('cy', String(ay));
      } catch (_) {}
    }

    function applyPos() {
      host.style.left = posX + 'px';
      host.style.top  = posY + 'px';
      updateThread();
    }

    function setVisible(visible) {
      host.style.visibility  = visible ? '' : 'hidden';
      // Re-attach SVG layer if Claude's SPA removed it from the document
      if (!svgLayer.isConnected) document.body.appendChild(svgLayer);
      line.style.visibility  = visible ? '' : 'hidden';
      dot.style.visibility   = visible ? '' : 'hidden';
    }

    function reposition() {
      if (!range) return;
      try {
        const r = range.getBoundingClientRect();

        // Hide everything when the anchor text is scrolled out of the viewport
        const inView = r.bottom > 0 && r.top < window.innerHeight &&
                       r.right  > 0 && r.left < window.innerWidth;
        setVisible(inView && !collapsed);
        // Also skip repositioning while collapsed — reposition() via setCollapsed handles it
        if (!inView || collapsed) return;

        if (!userDragged) {
          if (r.width + r.height === 0) return;
          let top  = r.bottom + OFFSET_Y;
          let left = r.left;
          if (left + cardW > window.innerWidth - 8) left = window.innerWidth - cardW - 8;
          if (left < 8) left = 8;
          if (top + 380 > window.innerHeight) {
            const above = r.top - OFFSET_Y - 380;
            if (above >= 8) top = above;
          }
          posX = left; posY = top;
          applyPos();
        } else {
          // Dragged overlay: position is fixed, but thread still needs to track the text
          updateThread();
        }
      } catch (_) {}
    }

    reposition();

    // Capture phase catches Claude's inner scroll container
    document.addEventListener('scroll', reposition, { capture: true, passive: true });
    window.addEventListener('resize',   reposition, { passive: true });

    // ── Drag ─────────────────────────────────────────────────────────────
    function onMouseMove(e) {
      if (!dragging) return;
      posX = Math.max(0, Math.min(e.clientX - dragOX, window.innerWidth  - cardW - 2));
      posY = Math.max(0, Math.min(e.clientY - dragOY, window.innerHeight - 50));
      applyPos();
    }
    function onMouseUp() {
      if (dragging) { justDragged = true; requestAnimationFrame(() => { justDragged = false; }); }
      dragging = false;
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);

    headEl.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
      dragging = true; userDragged = true;
      dragOX = e.clientX - posX;
      dragOY = e.clientY - posY;
    });

    // Resize via pointer capture — all move/up events route to the handle itself
    resizeHandle.addEventListener('pointerdown', e => {
      e.preventDefault();
      e.stopPropagation();
      resizeHandle.setPointerCapture(e.pointerId);
      resizeStartX = e.clientX;
      resizeStartY = e.clientY;
      resizeStartW = cardW;
      resizeStartH = cardH || card.offsetHeight;
    });
    resizeHandle.addEventListener('pointermove', e => {
      if (!resizeHandle.hasPointerCapture(e.pointerId)) return;
      cardW = Math.max(280, Math.min(680, resizeStartW + (e.clientX - resizeStartX)));
      cardH = Math.max(200, resizeStartH + (e.clientY - resizeStartY));
      card.style.width  = cardW + 'px';
      card.style.height = cardH + 'px';
      card.classList.add('ic--sized');
      updateThread();
    });
    resizeHandle.addEventListener('pointerup', e => {
      resizeHandle.releasePointerCapture(e.pointerId);
    });

    // ── Collapse / expand on selected-text click ──────────────────────────
    function isClickOnRange(clientX, clientY) {
      if (!range) return false;
      try {
        return Array.from(range.getClientRects()).some(r =>
          clientX >= r.left && clientX <= r.right &&
          clientY >= r.top  && clientY <= r.bottom
        );
      } catch (_) { return false; }
    }

    function setCollapsed(val) {
      collapsed = val;
      if (range) {
        try {
          if (val) { getHL()?.delete(range); getHLCollapsed()?.add(range); }
          else     { getHLCollapsed()?.delete(range); getHL()?.add(range); }
        } catch (_) {}
      }
      // Let reposition() be the single source of truth for visibility
      reposition();
    }

    function onDocClick(e) {
      if (justDragged) return;
      // Ignore clicks inside the overlay card itself
      if (e.target?.closest?.('[data-interchat-overlay]')) return;
      if (isClickOnRange(e.clientX, e.clientY)) setCollapsed(!collapsed);
    }
    document.addEventListener('click', onDocClick);

    // ── Keyboard isolation ────────────────────────────────────────────────
    // BUBBLE phase (not capture) so events reach inputEl first, then are
    // stopped from escaping the shadow tree to Claude's ProseMirror.
    card.addEventListener('keydown',  e => e.stopPropagation());
    card.addEventListener('keypress', e => e.stopPropagation());
    card.addEventListener('keyup',    e => e.stopPropagation());

    // Prevent mousedown from clearing the text selection
    [inputEl, sendBtn, closeBtn, histBtn].forEach(el => {
      el.addEventListener('mousedown', e => e.stopPropagation());
    });

    // ── Send ─────────────────────────────────────────────────────────────
    async function send() {
      const q = inputEl.value.trim();
      if (!q || busy) return;
      busy = true;
      inputEl.value = '';
      inputEl.style.height = 'auto';
      sendBtn.disabled = true;

      // Remove placeholder on first message
      const placeholder = msgsEl.querySelector('.ic-empty');
      if (placeholder) placeholder.remove();

      // Append a new Q&A exchange block
      const exchange = document.createElement('div');
      exchange.className = 'ic-exchange';
      const qEl = document.createElement('div');
      qEl.className = 'ic-msg-q';
      qEl.textContent = q;
      const aEl = document.createElement('div');
      aEl.className = 'ic-msg-a';
      aEl.innerHTML = '<div class="ic-dots"><span></span><span></span><span></span></div>';
      exchange.appendChild(qEl);
      exchange.appendChild(aEl);
      msgsEl.appendChild(exchange);

      // Scroll so the new question is visible at the top of the messages area,
      // leaving the end of the previous exchange in view as visual context.
      const msgsRect = msgsEl.getBoundingClientRect();
      const exRect   = exchange.getBoundingClientRect();
      msgsEl.scrollTop += (exRect.top - msgsRect.top) - 8;

      // Only include selected context on the first message — follow-ups use conversation history
      const isFirst = !convId;

      // Fetch rolling history summary if user has History ON and this is the first message
      let historySummary = null;
      if (isFirst && historyEnabled) {
        try {
          const r = await chrome.storage.session.get('interChat_history');
          const all = Array.isArray(r.interChat_history) ? r.interChat_history : [];
          const path = location.pathname;
          const relevant = all.filter(e => e.url === path);
          if (relevant.length > 0) {
            historySummary = relevant.map(e => `[H] ${e.h}\n[A] ${e.a}`).join('\n');
          }
        } catch (_) {}
      }

      let accumulated = '';
      try {
        if (!convId) convId = await ApiClient.createConversation();
        const res = await ApiClient.sendMessage({
          conversationId: convId, question: q,
          contextText: isFirst ? text : null,
          historySummary,
        });
        await parseSSE(res.body, {
          onToken(tok) { accumulated += tok; },
          onDone() {
            aEl.innerHTML = accumulated ? markdownToHtml(accumulated) : '';
            msgsEl.scrollTop = msgsEl.scrollHeight;
            busy = false; sendBtn.disabled = false;
          },
        });
      } catch (err) {
        console.error('[interChat] send error:', err);
        aEl.innerHTML = '<span class="ic-err">Error: ' + err.message + '</span>';
        busy = false; sendBtn.disabled = false;
      }
    }

    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    inputEl.addEventListener('input', () => {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 110) + 'px';
    });
    sendBtn.addEventListener('click', send);

    // ── Destroy ──────────────────────────────────────────────────────────
    function destroy() {
      try {
        document.removeEventListener('scroll', reposition, { capture: true });
        window.removeEventListener('resize', reposition);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup',   onMouseUp);
        document.removeEventListener('click',     onDocClick);
        window.__interChat.overlayTexts?.delete(text);
        if (range) { try { getHL()?.delete(range); getHLCollapsed()?.delete(range); } catch (_) {} }
        line.remove(); dot.remove();
        if (convId) ApiClient.deleteConversation(convId);
        overlayStack.splice(overlayStack.indexOf(destroy), 1);
        host.remove();
      } catch (e) { console.error('[interChat] destroy error:', e); }
    }
    closeBtn.addEventListener('click', destroy);
    overlayStack.push(destroy);

    // Focus the input after the overlay is painted
    requestAnimationFrame(() => requestAnimationFrame(() => {
      try { inputEl.focus(); } catch (_) {}
    }));
  }

  // ── Bootstrap ────────────────────────────────────────────────────────
  document.addEventListener('interchat:open-overlay', ({ detail }) => {
    console.log('[interChat] open-overlay event received');
    createOverlay(detail);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlayStack.length > 0)
      overlayStack[overlayStack.length - 1]();
  });

  console.log('[interChat] overlay.js ready');
})();
