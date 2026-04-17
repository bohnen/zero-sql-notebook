<script lang="ts">
  import ConnectionModal from './ConnectionModal.svelte';
  import InstanceBadge from './InstanceBadge.svelte';
  import Notebook from './Notebook.svelte';
  import NotebookToolbar from './NotebookToolbar.svelte';
  import SharedNotebookToolbar from './SharedNotebookToolbar.svelte';
  import Sidebar from './Sidebar.svelte';
  import Splash from './Splash.svelte';
  import UndoToast from './UndoToast.svelte';
  import { getActiveNotebook } from '../lib/state/notebook.svelte';
  import { clearShared, getShared, setShared } from '../lib/state/share.svelte';
  import {
    ensureInstance,
    getCurrentInstance,
    reprovisionInstance,
  } from '../lib/state/instance.svelte';
  import { isSidebarCollapsed, toggleSidebar } from '../lib/state/ui.svelte';
  import { handleCallbackIfPresent } from '../lib/auth/github.svelte';
  import { loadSharedGist, shareNotebook } from '../lib/share/share';

  type Phase = { kind: 'provisioning' } | { kind: 'ready' } | { kind: 'error'; message: string };

  let phase = $state<Phase>({ kind: 'provisioning' });
  let pendingShareError = $state<string | null>(null);
  let showConnection = $state(false);

  async function provision(force = false) {
    phase = { kind: 'provisioning' };
    try {
      if (force) {
        await reprovisionInstance();
      } else {
        await ensureInstance();
      }
      phase = { kind: 'ready' };
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
  const instance = $derived(getCurrentInstance());
  const sidebarCollapsed = $derived(isSidebarCollapsed());
</script>

{#if phase.kind === 'provisioning'}
  <Splash status="provisioning" />
{:else if phase.kind === 'error'}
  <Splash status="error" message={phase.message} onRetry={() => provision(true)} />
{:else}
  <div class="layout">
    {#if !sidebarCollapsed}
      <Sidebar />
    {/if}
    <main>
      <header>
        <div class="head-left">
          <button
            type="button"
            class="toggle"
            onclick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Show notebooks' : 'Hide notebooks'}
            title={sidebarCollapsed ? 'Show notebooks' : 'Hide notebooks'}
          >
            {#if sidebarCollapsed}☰{:else}⟨{/if}
          </button>
          <h1>Zero Notebook</h1>
        </div>
        {#if instance}
          <InstanceBadge {instance} onOpen={() => (showConnection = true)} />
        {/if}
      </header>
      {#if pendingShareError}
        <div class="banner error">
          {pendingShareError}
          <button type="button" onclick={() => (pendingShareError = null)}>×</button>
        </div>
      {/if}
      <div class="body">
        {#if shared}
          <Notebook notebook={shared.notebook} {instance} readOnly>
            {#snippet toolbarExtras()}
              <SharedNotebookToolbar notebook={shared.notebook} onClose={() => clearShared()} />
            {/snippet}
          </Notebook>
        {:else if activeNotebook}
          <Notebook notebook={activeNotebook} {instance}>
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
  {#if showConnection && instance}
    <ConnectionModal
      {instance}
      onClose={() => (showConnection = false)}
      onReprovisioned={() => (showConnection = false)}
    />
  {/if}
  <UndoToast />
{/if}

<style>
  :global(*),
  :global(*::before),
  :global(*::after) {
    box-sizing: border-box;
  }
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
    padding: 10px 24px;
    border-bottom: 1px solid #2e3350;
    background: #1a1d27;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .head-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .toggle {
    background: #22263a;
    color: #e2e8f0;
    border: 1px solid #2e3350;
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 14px;
    cursor: pointer;
    line-height: 1;
  }
  .toggle:hover {
    background: #2e3350;
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
    margin: 8px 24px 0;
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
