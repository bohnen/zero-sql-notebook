/**
 * Svelte action: grow a <textarea> to fit its content.
 *
 * Pass the bound source value so the action's `update` fires on external
 * changes (e.g. switching notebooks); for user typing the input event handles
 * the grow step. We clear the explicit height before measuring scrollHeight so
 * the element can also shrink.
 */
export function autosize(node: HTMLTextAreaElement, _source: string) {
  function resize() {
    node.style.height = 'auto';
    node.style.height = `${node.scrollHeight}px`;
  }

  function schedule() {
    // Run after the browser has applied the new value.
    queueMicrotask(resize);
  }

  schedule();
  node.addEventListener('input', resize);

  return {
    update(_next: string) {
      schedule();
    },
    destroy() {
      node.removeEventListener('input', resize);
    },
  };
}
