<script lang="ts">
  import type { Notebook } from '../lib/notebook/types';
  import { downloadProjectZip } from '../lib/project/zip';
  import { slugify } from '../lib/project/slug';

  interface Props {
    notebooks: Notebook[];
    onClose: () => void;
  }

  let { notebooks, onClose }: Props = $props();

  // The modal is mounted fresh each time it opens, so capturing `notebooks`
  // once at setup is intentional — suppress the Svelte 5 warning.
  // eslint-disable-next-line svelte/valid-compile
  let title = $state(notebooks[0]?.title?.trim() || 'Untitled project');
  // eslint-disable-next-line svelte/valid-compile
  const selected = $state(new Map<string, boolean>(notebooks.map((n) => [n.id, true])));
  let error = $state<string | null>(null);

  const slug = $derived(slugify(title));
  const selectedCount = $derived(notebooks.reduce((n, nb) => n + (selected.get(nb.id) ? 1 : 0), 0));

  function toggle(id: string) {
    selected.set(id, !selected.get(id));
  }

  function onDownload() {
    error = null;
    const picked = notebooks.filter((nb) => selected.get(nb.id));
    if (picked.length === 0) return;
    try {
      downloadProjectZip({ title, notebooks: picked });
      onClose();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }
</script>

<div
  class="overlay"
  role="button"
  tabindex="-1"
  onclick={onClose}
  onkeydown={(e) => e.key === 'Escape' && onClose()}
>
  <div
    class="modal"
    role="dialog"
    aria-modal="true"
    aria-label="Export project"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    tabindex="-1"
  >
    <header>
      <h2>Export project as .zip</h2>
      <button type="button" class="close" onclick={onClose} aria-label="Close">×</button>
    </header>

    <label class="field">
      <span>Title</span>
      <input type="text" bind:value={title} />
    </label>

    <fieldset class="picklist">
      <legend>Include notebooks (order = sidebar)</legend>
      {#if notebooks.length === 0}
        <p class="hint">No notebooks in this workspace.</p>
      {:else}
        <ul>
          {#each notebooks as nb (nb.id)}
            <li>
              <label>
                <input
                  type="checkbox"
                  checked={selected.get(nb.id) ?? false}
                  onchange={() => toggle(nb.id)}
                />
                <span>{nb.title || 'Untitled'}</span>
              </label>
            </li>
          {/each}
        </ul>
      {/if}
    </fieldset>

    <div class="filename">
      Filename: <code>{slug}.zip</code>
    </div>

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <footer>
      <button type="button" onclick={onClose}>Cancel</button>
      <button type="button" class="primary" disabled={selectedCount === 0} onclick={onDownload}>
        Download ({selectedCount})
      </button>
    </footer>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 17, 23, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    border: none;
    padding: 0;
  }
  .modal {
    background: #1a1d27;
    border: 1px solid #2e3350;
    border-radius: 8px;
    width: min(520px, 96vw);
    color: #e2e8f0;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  header h2 {
    margin: 0;
    font-size: 15px;
  }
  .close {
    background: transparent;
    color: #7c85a2;
    border: none;
    font-size: 20px;
    cursor: pointer;
    padding: 4px 8px;
  }
  .close:hover {
    color: #e2e8f0;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
  }
  .field span {
    color: #7c85a2;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    font-size: 11px;
  }
  .field input {
    background: #191c2a;
    border: 1px solid #2e3350;
    border-radius: 4px;
    padding: 6px 8px;
    color: #e2e8f0;
    font-size: 13px;
  }
  .field input:focus {
    outline: none;
    border-color: #f76e3c;
  }
  .picklist {
    border: 1px solid #2e3350;
    border-radius: 4px;
    padding: 8px 12px;
    margin: 0;
  }
  .picklist legend {
    padding: 0 4px;
    color: #7c85a2;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .picklist ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 200px;
    overflow-y: auto;
  }
  .picklist label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    cursor: pointer;
    padding: 2px 0;
  }
  .picklist input[type='checkbox'] {
    accent-color: #f76e3c;
  }
  .hint {
    margin: 0;
    color: #7c85a2;
    font-size: 12px;
  }
  .filename {
    font-size: 11px;
    color: #7c85a2;
  }
  .filename code {
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    color: #e2e8f0;
    background: #22263a;
    padding: 1px 6px;
    border-radius: 3px;
  }
  .error {
    margin: 0;
    color: #f87171;
    font-size: 12px;
    padding: 6px 8px;
    border: 1px solid #5a1f1f;
    background: #2a1414;
    border-radius: 4px;
  }
  footer {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  footer button {
    background: #22263a;
    color: #e2e8f0;
    border: 1px solid #2e3350;
    border-radius: 4px;
    font-size: 12px;
    padding: 6px 14px;
    cursor: pointer;
    font-weight: 600;
  }
  footer button:hover:not(:disabled) {
    background: #2e3350;
  }
  footer button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .primary {
    background: #f76e3c;
    color: #fff;
    border-color: #f76e3c;
  }
  .primary:hover:not(:disabled) {
    background: #e55e2c;
  }
</style>
