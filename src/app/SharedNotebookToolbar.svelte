<script lang="ts">
  import type { Notebook } from '../lib/notebook/types';
  import { importNotebook, setActiveId } from '../lib/state/notebook.svelte';

  interface Props {
    notebook: Notebook;
    onClose: () => void;
  }

  let { notebook, onClose }: Props = $props();

  function onCopy() {
    const newId = importNotebook(notebook.title, notebook.cells, { gistId: notebook.gistId });
    setActiveId(newId);
    onClose();
  }
</script>

<div class="bar">
  <span class="badge">Shared</span>
  <button type="button" class="primary" onclick={onCopy}>Copy to My Notebooks</button>
  <button type="button" class="ghost" onclick={onClose} title="Close shared view">✕</button>
</div>

<style>
  .bar {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .badge {
    background: #221b38;
    color: #a78bfa;
    border: 1px solid #3d2e6a;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
  }
  button {
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    padding: 6px 12px;
    border: 1px solid #2e3350;
    color: #e2e8f0;
  }
  .primary {
    background: #f76e3c;
    color: #fff;
    border-color: #f76e3c;
  }
  .primary:hover {
    background: #e55e2c;
  }
  .ghost {
    background: #22263a;
  }
  .ghost:hover {
    background: #2e3350;
  }
</style>
