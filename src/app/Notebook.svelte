<script lang="ts">
  import {
    addCell,
    getNotebook,
    moveCell,
    removeCell,
    updateCellSource,
  } from '../lib/state/notebook.svelte';
  import type { Instance } from '../lib/instance/client';
  import MarkdownCell from './cells/MarkdownCell.svelte';
  import SqlCell from './cells/SqlCell.svelte';
  import EnvCell from './cells/EnvCell.svelte';

  interface Props {
    instance: Instance | null;
  }

  let { instance }: Props = $props();
  const notebook = $derived(getNotebook());
</script>

<section class="notebook">
  <h2 class="title">{notebook.title}</h2>
  <div class="cells">
    {#each notebook.cells as cell, idx (cell.id)}
      <article class="cell-wrap cell-{cell.type}">
        <header class="cell-header">
          <span class="label">{cell.type}</span>
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
        </header>
        {#if cell.type === 'markdown'}
          <MarkdownCell source={cell.source} onChange={(next) => updateCellSource(cell.id, next)} />
        {:else if cell.type === 'sql'}
          <SqlCell
            source={cell.source}
            onChange={(next) => updateCellSource(cell.id, next)}
            {instance}
          />
        {:else}
          <EnvCell source={cell.source} onChange={(next) => updateCellSource(cell.id, next)} />
        {/if}
      </article>
    {/each}
  </div>
  {#if notebook.cells.length === 0}
    <p class="empty">This notebook has no cells yet.</p>
  {/if}
  <footer class="footer">
    <button type="button" onclick={() => addCell('markdown')}>+ md</button>
    <button type="button" onclick={() => addCell('sql')}>+ sql</button>
    <button type="button" onclick={() => addCell('env')}>+ env</button>
  </footer>
</section>

<style>
  .notebook {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .title {
    font-size: 18px;
    font-weight: 600;
    color: #e2e8f0;
    margin: 0;
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
