<script lang="ts">
  import { codemirror } from '../../editor/codemirror';
  import { runCell, SqlFetchError, UndefinedVariableError } from '../../lib/execute/run';
  import type { SqlResult } from '../../lib/execute/run';
  import type { Instance } from '../../lib/instance/client';
  import type { Cell } from '../../lib/notebook/types';
  import { reprovisionInstance } from '../../lib/state/instance.svelte';
  import {
    getCellExecution,
    patchCellExecution,
    resetCellExecution,
  } from '../../lib/state/results.svelte';
  import { registerController, registerRunner } from '../../lib/state/runners';
  import { showToast } from '../../lib/state/toast.svelte';
  import ResultPanel from './ResultPanel.svelte';

  interface Props {
    cellId: string;
    source: string;
    cells: Cell[];
    onChange: (next: string) => void;
    instance: Instance | null;
    readOnly?: boolean;
    cellIndex?: number;
    notebookTitle?: string;
  }

  let {
    cellId,
    source,
    cells,
    onChange,
    instance,
    readOnly = false,
    cellIndex = 0,
    notebookTitle = 'notebook',
  }: Props = $props();

  const execState = $derived(getCellExecution(cellId));

  async function runOnce(currentInstance: Instance, signal: AbortSignal): Promise<SqlResult> {
    return runCell({ source, cells, instance: currentInstance }, { signal });
  }

  async function run(): Promise<boolean> {
    if (!instance || execState.running) return false;
    resetCellExecution(cellId);
    const controller = new AbortController();
    registerController(cellId, controller);
    const start = performance.now();
    try {
      let currentInstance = instance;
      let retried = false;
      while (true) {
        try {
          const r = await runOnce(currentInstance, controller.signal);
          patchCellExecution(cellId, {
            result: r,
            elapsedMs: Math.round(performance.now() - start),
          });
          return true;
        } catch (err) {
          if (
            !retried &&
            err instanceof SqlFetchError &&
            (err.status === 401 || err.status === 403)
          ) {
            retried = true;
            showToast({
              message: 'Instance looks expired. Reprovisioning…',
              durationMs: 3000,
            });
            currentInstance = await reprovisionInstance();
            continue;
          }
          throw err;
        }
      }
    } catch (err) {
      let message: string;
      if (err instanceof UndefinedVariableError) {
        message = err.refs
          .map((r) => `Undefined variable \${${r.name}} at line ${r.line}, col ${r.col}`)
          .join('\n');
      } else if (err instanceof DOMException && err.name === 'AbortError') {
        message = 'Cancelled';
      } else if (err instanceof DOMException && err.name === 'TimeoutError') {
        message = 'Timed out';
      } else if (err instanceof SqlFetchError && (err.status === 401 || err.status === 403)) {
        message = `${err.message}\nClick the connection badge → Reprovision to recover.`;
      } else {
        message = err instanceof Error ? err.message : String(err);
      }
      patchCellExecution(cellId, {
        error: message,
        elapsedMs: Math.round(performance.now() - start),
      });
      return false;
    } finally {
      patchCellExecution(cellId, { running: false });
      registerController(cellId, null);
    }
  }

  $effect(() => {
    const unregister = registerRunner(cellId, run);
    return unregister;
  });
</script>

<div class="sql-cell">
  <div class="editor" use:codemirror={{ doc: source, onChange, onRun: run, readOnly }}></div>
  {#if execState.result !== null || execState.error !== null || execState.running}
    <ResultPanel
      result={execState.result}
      elapsedMs={execState.elapsedMs}
      error={execState.error}
      running={execState.running}
      {cellIndex}
      {notebookTitle}
    />
  {/if}
</div>

<style>
  .sql-cell {
    display: flex;
    flex-direction: column;
    gap: 6px;
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
