<script lang="ts">
  import {
    addCell,
    moveCell,
    removeCell,
    renameNotebook,
    updateCellSource,
  } from '../lib/state/notebook.svelte';
  import { cancelAll, getRunner } from '../lib/state/runners';
  import type { Instance } from '../lib/instance/client';
  import type { Notebook } from '../lib/notebook/types';
  import MarkdownCell from './cells/MarkdownCell.svelte';
  import SqlCell from './cells/SqlCell.svelte';
  import EnvCell from './cells/EnvCell.svelte';

  interface Props {
    notebook: Notebook;
    instance: Instance | null;
    readOnly?: boolean;
    toolbarExtras?: import('svelte').Snippet;
  }

  let { notebook, instance, readOnly = false, toolbarExtras }: Props = $props();
  let runningAll = $state(false);

  async function runAll() {
    if (runningAll) return;
    runningAll = true;
    try {
      for (const cell of notebook.cells) {
        if (cell.type !== 'sql') continue;
        const fn = getRunner(cell.id);
        if (!fn) continue;
        const ok = await fn();
        if (!ok) break;
      }
    } finally {
      runningAll = false;
    }
  }

  function cancel() {
    cancelAll();
    runningAll = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && runningAll) cancel();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<section class="notebook">
  <div class="title-row">
    {#if readOnly}
      <h2 class="title ro">{notebook.title || 'Untitled'}</h2>
    {:else}
      <input
        class="title"
        type="text"
        value={notebook.title}
        oninput={(e) => renameNotebook(notebook.id, (e.currentTarget as HTMLInputElement).value)}
      />
    {/if}
    <div class="top-actions">
      {#if toolbarExtras}{@render toolbarExtras()}{/if}
      <button type="button" class="run-all" disabled={runningAll || !instance} onclick={runAll}>
        ▶▶ Run All
      </button>
      {#if runningAll}
        <button type="button" class="cancel" onclick={cancel}>■ Cancel (Esc)</button>
      {/if}
    </div>
  </div>
  <div class="cells">
    {#each notebook.cells as cell, idx (cell.id)}
      <article class="cell-wrap cell-{cell.type}">
        <header class="cell-header">
          <span class="label">{cell.type}</span>
          {#if !readOnly}
            <div class="actions">
              <button
                type="button"
                aria-label="Move up"
                disabled={idx === 0}
                onclick={() => moveCell(cell.id, -1)}>▲</button
              >
              <button
                type="button"
                aria-label="Move down"
                disabled={idx === notebook.cells.length - 1}
                onclick={() => moveCell(cell.id, 1)}>▼</button
              >
              <button
                type="button"
                aria-label="Delete cell"
                class="danger"
                onclick={() => removeCell(cell.id)}>×</button
              >
            </div>
          {/if}
        </header>
        {#if cell.type === 'markdown'}
          <MarkdownCell
            source={cell.source}
            {readOnly}
            onChange={(next) => updateCellSource(cell.id, next)}
          />
        {:else if cell.type === 'sql'}
          <SqlCell
            cellId={cell.id}
            source={cell.source}
            cells={notebook.cells}
            {readOnly}
            onChange={(next) => updateCellSource(cell.id, next)}
            {instance}
          />
        {:else}
          <EnvCell
            source={cell.source}
            {readOnly}
            onChange={(next) => updateCellSource(cell.id, next)}
          />
        {/if}
      </article>
    {/each}
  </div>
  {#if notebook.cells.length === 0}
    <p class="empty">This notebook has no cells yet.</p>
  {/if}
  {#if !readOnly}
    <footer class="footer">
      <button type="button" onclick={() => addCell('markdown')}>+ md</button>
      <button type="button" onclick={() => addCell('sql')}>+ sql</button>
      <button type="button" onclick={() => addCell('env')}>+ env</button>
    </footer>
  {/if}
</section>

<style>
  .notebook {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .title {
    font-size: 18px;
    font-weight: 600;
    color: #e2e8f0;
    margin: 0;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 4px 8px;
    min-width: 0;
    flex: 1;
  }
  .title:focus {
    outline: none;
    border-color: #2e3350;
    background: #22263a;
  }
  .title.ro {
    padding: 4px 0;
  }
  .top-actions {
    display: flex;
    gap: 6px;
  }
  .run-all {
    background: #22263a;
    color: #e2e8f0;
    border: 1px solid #2e3350;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .run-all:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .run-all:hover:not(:disabled) {
    background: #2e3350;
  }
  .cancel {
    background: #5a1f1f;
    color: #f87171;
    border: 1px solid #f87171;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .cells {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .cell-wrap {
    border: 1px solid #2e3350;
    border-radius: 6px;
    padding: 10px;
    background: #1a1d27;
  }
  .cell-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #7c85a2;
  }
  .cell-sql .label {
    color: #f76e3c;
  }
  .cell-env .label {
    color: #a78bfa;
  }
  .actions {
    display: flex;
    gap: 4px;
  }
  .actions button {
    background: #22263a;
    color: #e2e8f0;
    border: 1px solid #2e3350;
    border-radius: 4px;
    font-size: 12px;
    padding: 2px 8px;
    cursor: pointer;
  }
  .actions button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .actions button:hover:not(:disabled) {
    background: #2e3350;
  }
  .actions .danger:hover:not(:disabled) {
    background: #5a1f1f;
    border-color: #f87171;
  }
  .empty {
    color: #7c85a2;
    font-size: 13px;
  }
  .footer {
    display: flex;
    gap: 8px;
  }
  .footer button {
    background: #22263a;
    color: #e2e8f0;
    border: 1px solid #2e3350;
    border-radius: 4px;
    font-size: 12px;
    padding: 6px 12px;
    cursor: pointer;
  }
  .footer button:hover {
    background: #2e3350;
  }
</style>
