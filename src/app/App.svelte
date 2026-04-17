<script lang="ts">
  import Notebook from './Notebook.svelte';
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
  <header>
    <h1>Zero Notebook</h1>
  </header>
  <main>
    <Notebook instance={phase.instance} />
  </main>
{:else if phase.kind === 'provisioning'}
  <Splash status="provisioning" />
{:else}
  <Splash status="error" message={phase.message} onRetry={() => provision(true)} />
{/if}

<style>
  :global(body) {
    margin: 0;
    background: #0f1117;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  header {
    padding: 14px 24px;
    border-bottom: 1px solid #2e3350;
    background: #1a1d27;
  }
  header h1 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
  }
  main {
    padding: 24px;
    max-width: 960px;
    margin: 0 auto;
  }
</style>
