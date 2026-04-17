<script lang="ts">
  import { codemirror } from '../../editor/codemirror';
  import { runCell, type SqlResult } from '../../lib/execute/run';
  import type { Instance } from '../../lib/instance/client';
  import ResultPanel from './ResultPanel.svelte';

  interface Props {
    source: string;
    onChange: (next: string) => void;
    instance: Instance | null;
  }

  let { source, onChange, instance }: Props = $props();

  let running = $state(false);
  let result = $state<SqlResult | null>(null);
  let error = $state<string | null>(null);
  let elapsedMs = $state<number | null>(null);

  async function run() {
    if (!instance || running) return;
    running = true;
    error = null;
    result = null;
    elapsedMs = null;
    const start = performance.now();
    try {
      const r = await runCell(source, instance);
      elapsedMs = Math.round(performance.now() - start);
      result = r;
    } catch (err) {
      elapsedMs = Math.round(performance.now() - start);
      error = err instanceof Error ? err.message : String(err);
    } finally {
      running = false;
    }
  }
</script>

<div class="sql-cell">
  <div class="toolbar">
    <button
      type="button"
      class="run"
      disabled={running || !instance}
      onclick={run}
      title="Run (Cmd/Ctrl+Enter)"
    >
      {running ? '…' : '▶'} Run
    </button>
  </div>
  <div class="editor" use:codemirror={{ doc: source, onChange, onRun: run }}></div>
  {#if result !== null || error !== null || running}
    <ResultPanel {result} {elapsedMs} {error} {running} />
  {/if}
</div>

<style>
  .sql-cell {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .toolbar {
    display: flex;
    justify-content: flex-end;
  }
  .run {
    background: #f76e3c;
    color: #fff;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    padding: 4px 12px;
    cursor: pointer;
  }
  .run:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .editor {
    border: 1px solid #2e3350;
    border-radius: 4px;
    overflow: hidden;
  }
  .editor :global(.cm-editor) {
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    font-size: 13px;
  }
  .editor :global(.cm-content) {
    min-height: 60px;
  }
</style>
