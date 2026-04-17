<script lang="ts">
  import Notebook from './Notebook.svelte';
  import NotebookToolbar from './NotebookToolbar.svelte';
  import SharedNotebookToolbar from './SharedNotebookToolbar.svelte';
  import Sidebar from './Sidebar.svelte';
  import Splash from './Splash.svelte';
  import { getInstance, type Instance } from '../lib/instance/client';
  import { getActiveNotebook } from '../lib/state/notebook.svelte';
  import { clearShared, getShared, setShared } from '../lib/state/share.svelte';
  import { handleCallbackIfPresent } from '../lib/auth/github.svelte';
  import { loadSharedGist, shareNotebook } from '../lib/share/share';

  type Phase =
    | { kind: 'provisioning' }
    | { kind: 'ready'; instance: Instance }
    | { kind: 'error'; message: string };

  let phase = $state<Phase>({ kind: 'provisioning' });
  let pendingShareError = $state<string | null>(null);

  async function provision(force = false) {
    phase = { kind: 'provisioning' };
    try {
      const instance = await getInstance(force);
      phase = { kind: 'ready', instance };
    } catch (err) {
      phase = { kind: 'error', message: err instanceof Error ? err.message : String(err) };
    }
  }

  async function handleOAuthCallback(): Promise<void> {
    try {
      const result = await handleCallbackIfPresent();
      if (!result) return;
      const pending = result.pending;
      if (pending?.kind === 'share' || pending?.kind === 'update') {
        const notebook =
          getActiveNotebook()?.id === pending.notebookId ? getActiveNotebook() : null;
        if (!notebook) return;
        const res = await shareNotebook(notebook);
        window.prompt('Shared URL (copy):', `${window.location.origin}/?gist_id=${res.gistId}`);
      }
    } catch (err) {
      pendingShareError = err instanceof Error ? err.message : String(err);
    }
  }

  async function maybeLoadSharedGist(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const gistId = params.get('gist_id');
    if (!gistId) return;
    try {
      const { notebook } = await loadSharedGist(gistId);
      setShared({ notebook, gistId, ownedByMe: false });
    } catch (err) {
      pendingShareError = err instanceof Error ? err.message : String(err);
    }
  }

  void (async () => {
    await handleOAuthCallback();
    await maybeLoadSharedGist();
    await provision();
  })();

  const shared = $derived(getShared());
  const activeNotebook = $derived(getActiveNotebook());
</script>

{#if phase.kind === 'provisioning'}
  <Splash status="provisioning" />
{:else if phase.kind === 'error'}
  <Splash status="error" message={phase.message} onRetry={() => provision(true)} />
{:else}
  <div class="layout">
    <Sidebar />
    <main>
      <header>
        <h1>Zero Notebook</h1>
        {#if pendingShareError}
          <div class="banner error">
            {pendingShareError}
            <button type="button" onclick={() => (pendingShareError = null)}>×</button>
          </div>
        {/if}
      </header>
      <div class="body">
        {#if shared}
          <Notebook notebook={shared.notebook} instance={phase.instance} readOnly>
            {#snippet toolbarExtras()}
              <SharedNotebookToolbar notebook={shared.notebook} onClose={() => clearShared()} />
            {/snippet}
          </Notebook>
        {:else if activeNotebook}
          <Notebook notebook={activeNotebook} instance={phase.instance}>
            {#snippet toolbarExtras()}
              <NotebookToolbar notebook={activeNotebook} />
            {/snippet}
          </Notebook>
        {:else}
          <p class="empty">No notebook selected.</p>
        {/if}
      </div>
    </main>
  </div>
{/if}

<style>
  :global(html),
  :global(body) {
    margin: 0;
    height: 100%;
  }
  :global(body) {
    background: #0f1117;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  .layout {
    display: flex;
    height: 100dvh;
  }
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  header {
    padding: 14px 24px;
    border-bottom: 1px solid #2e3350;
    background: #1a1d27;
    flex-shrink: 0;
  }
  header h1 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
  }
  .body {
    flex: 1;
    overflow: auto;
    padding: 24px;
  }
  .banner {
    margin-top: 8px;
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .banner.error {
    background: #2a1414;
    border: 1px solid #f87171;
    color: #f87171;
  }
  .banner button {
    background: transparent;
    color: inherit;
    border: none;
    cursor: pointer;
    font-size: 14px;
  }
  .empty {
    color: #7c85a2;
    font-size: 13px;
  }
</style>
