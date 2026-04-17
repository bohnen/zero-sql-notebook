<script lang="ts">
  import { getAuth, logout } from '../lib/auth/github.svelte';
  import { downloadNotebookMarkdown } from '../lib/io/md';
  import type { Notebook } from '../lib/notebook/types';
  import { setGistId } from '../lib/state/notebook.svelte';
  import { shareNotebook } from '../lib/share/share';

  interface Props {
    notebook: Notebook;
  }

  let { notebook }: Props = $props();
  const auth = $derived(getAuth());
  let busy = $state(false);
  let error = $state<string | null>(null);

  async function onShare() {
    if (busy) return;
    busy = true;
    error = null;
    try {
      const res = await shareNotebook(notebook);
      setGistId(notebook.id, res.gistId);
      window.prompt(`Share URL (copy):`, `${window.location.origin}/?gist_id=${res.gistId}`);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Redirecting')) return;
      error = err instanceof Error ? err.message : String(err);
    } finally {
      busy = false;
    }
  }
</script>

<div class="toolbar">
  <button
    type="button"
    onclick={() => downloadNotebookMarkdown(notebook)}
    title="Download as Markdown"
  >
    Export .md
  </button>
  {#if auth}
    <button
      type="button"
      class="share"
      disabled={busy}
      onclick={onShare}
      title={notebook.gistId ? 'Update existing Gist' : 'Create a secret Gist and share'}
    >
      {busy ? '…' : notebook.gistId ? 'Update Gist' : 'Share'}
    </button>
    <button type="button" class="ghost" onclick={logout} title="Disconnect GitHub">⎋</button>
  {:else}
    <button type="button" class="share" disabled={busy} onclick={onShare}> Share (sign in) </button>
  {/if}
</div>
{#if error}
  <div class="error" role="alert">{error}</div>
{/if}

<style>
  .toolbar {
    display: flex;
    gap: 6px;
  }
  button {
    background: #22263a;
    color: #e2e8f0;
    border: 1px solid #2e3350;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  button:hover:not(:disabled) {
    background: #2e3350;
  }
  .share {
    background: #191c2a;
  }
  .share:hover:not(:disabled) {
    background: #22263a;
    border-color: #f76e3c;
  }
  .ghost {
    padding: 6px 8px;
  }
  .error {
    grid-column: 1 / -1;
    color: #f87171;
    font-size: 11px;
    margin-top: 4px;
  }
</style>
