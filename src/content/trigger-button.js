/**
 * trigger-button.js — floating "Ask" button that appears on text selection
 *
 * Lives in its own Shadow DOM host so Claude's CSS cannot affect it.
 * Uses pointer-events: none on the host so it never accidentally
 * collapses the user's text selection.
 */

(function () {
  // Host element — transparent, covers nothing, allows pointer passthrough
  const triggerHost = document.createElement('div');
  triggerHost.id = 'interchat-trigger-host';
  triggerHost.style.cssText = [
    'position: absolute',
    'z-index: 2147483647',
    'pointer-events: none',
    'top: 0',
    'left: 0',
  ].join('; ');
  document.body.appendChild(triggerHost);

  const shadow = triggerHost.attachShadow({ mode: 'closed' });

  const button = document.createElement('button');
  button.textContent = 'Ask';
  button.style.cssText = [
    'display: none',
    'pointer-events: all',
    'background: #7c3aed',
    'color: #fff',
    'border: none',
    'border-radius: 6px',
    'padding: 4px 12px',
    'font-size: 12px',
    'font-weight: 600',
    'font-family: system-ui, -apple-system, sans-serif',
    'cursor: pointer',
    'box-shadow: 0 2px 8px rgba(0,0,0,0.35)',
    'letter-spacing: 0.02em',
    'white-space: nowrap',
    'transition: background 0.15s',
  ].join('; ');

  button.addEventListener('mouseenter', () => { button.style.background = '#6d28d9'; });
  button.addEventListener('mouseleave', () => { button.style.background = '#7c3aed'; });

  shadow.appendChild(button);

  let savedText = '';
  let savedRange = null;

  document.addEventListener('interchat:text-selected', ({ detail }) => {
    savedText = detail.text;
    savedRange = detail.range || null;

    // Don't show Ask if this text already has an active overlay
    if (window.__interChat?.overlayTexts?.has(savedText)) return;

    // Use viewport-relative coords for position: fixed trigger host
    triggerHost.style.position = 'fixed';
    triggerHost.style.top = `${detail.rect.bottom + 6}px`;
    triggerHost.style.left = `${detail.rect.left}px`;
    button.style.display = 'block';
  });

  document.addEventListener('interchat:selection-cleared', () => {
    button.style.display = 'none';
    savedText = '';
    savedRange = null;
  });

  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!savedText) return;

    button.style.display = 'none';

    document.dispatchEvent(new CustomEvent('interchat:open-overlay', {
      detail: { text: savedText, range: savedRange },
    }));
  });

  // Re-position trigger button on scroll using live Range coords
  window.addEventListener('scroll', () => {
    if (button.style.display === 'none' || !savedRange) return;
    try {
      const r = savedRange.getBoundingClientRect();
      triggerHost.style.top = `${r.bottom + 6}px`;
      triggerHost.style.left = `${r.left}px`;
    } catch (_) {}
  }, { passive: true });
})();
