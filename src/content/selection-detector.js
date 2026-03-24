/**
 * selection-detector.js — monitors text selection on claude.ai
 *
 * Fires custom DOM events:
 *   interchat:text-selected  { text, rect }  — non-trivial selection inside a Claude response
 *   interchat:selection-cleared              — selection collapsed or cleared
 */

(function () {
  let debounceTimer = null;

  function checkSelection() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const selection = window.getSelection();
      console.log('[interChat] checkSelection fired, text:', selection?.toString()?.slice(0, 30));

      if (!selection || selection.isCollapsed || selection.toString().trim().length < 3) {
        document.dispatchEvent(new CustomEvent('interchat:selection-cleared'));
        return;
      }

      const selectedText = selection.toString().trim();
      const anchorNode = selection.anchorNode;
      if (!anchorNode) return;

      // Verify the selection is inside a Claude assistant message, not the input area.
      // Claude's DOM uses data-testid attributes which are more stable than class names.
      const el = anchorNode.nodeType === Node.TEXT_NODE
        ? anchorNode.parentElement
        : anchorNode;

      if (!el) return;

      // Exclude selection inside the user's own input area
      const isInInput = el.closest(
        'textarea, [contenteditable="true"], [role="textbox"], form'
      );
      if (isInInput) return;

      // Log the element so we can discover Claude's actual DOM structure
      console.log('[interChat] selected el:', el.tagName, el.className?.slice?.(0, 80));
      console.log('[interChat] parent chain:',
        [el, el.parentElement, el.parentElement?.parentElement,
         el.parentElement?.parentElement?.parentElement]
          .filter(Boolean)
          .map(n => `${n.tagName}${n.dataset?.testid ? '[data-testid=' + n.dataset.testid + ']' : ''}`)
          .join(' → ')
      );

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Ignore zero-size selections (keyboard caret)
      if (rect.width === 0 && rect.height === 0) return;

      // Clone the range — it stays valid even after the selection is cleared
      const savedRange = range.cloneRange();

      document.dispatchEvent(new CustomEvent('interchat:text-selected', {
        detail: { text: selectedText, rect, range: savedRange },
      }));
    }, 120);
  }

  console.log('[interChat] selection-detector active');
  document.addEventListener('mouseup', checkSelection);

  // Keyboard selection (shift+arrow, ctrl+a, etc.)
  document.addEventListener('keyup', (e) => {
    if (e.shiftKey || e.key === 'a' || e.key === 'A') {
      checkSelection();
    }
  });

  // Clear selection when clicking outside overlay/trigger button
  document.addEventListener('mousedown', (e) => {
    if (e.target?.closest?.('#interchat-trigger-host, [data-interchat-overlay]')) return;
    clearTimeout(debounceTimer);
    document.dispatchEvent(new CustomEvent('interchat:selection-cleared'));
  });
})();
