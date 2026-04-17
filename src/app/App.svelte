<script lang="ts">
  import Notebook from './Notebook.svelte';
  import Sidebar from './Sidebar.svelte';
  import Splash from './Splash.svelte';
  import { getInstance, type Instance } from '../lib/instance/client';

  type Phase =
    | { kind: 'provisioning' }
    | { kind: 'ready'; instance: Instance }
    | { kind: 'error'; message: string };

  let phase = $state<Phase>({ kind: 'provisioning' });

  async function provision(force = false) {
    phase = { kind: 'provisioning' };
    try {
      const instance = await getInstance(force);
      phase = { kind: 'ready', instance };
    } catch (err) {
      phase = { kind: 'error', message: err instanceof Error ? err.message : String(err) };
    }
  }

  void provision();
</script>

{#if phase.kind === 'ready'}
  <div class="layout">
    <Sidebar />
    <main>
      <header>
        <h1>Zero Notebook</h1>
      </header>
      <div class="body">
        <Notebook instance={phase.instance} />
      </div>
    </main>
  </div>
{:else if phase.kind === 'provisioning'}
  <Splash status="provisioning" />
{:else}
  <Splash status="error" message={phase.message} onRetry={() => provision(true)} />
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
</style>
