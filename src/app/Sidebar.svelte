<script lang="ts">
  import {
    createNotebook,
    deleteNotebook,
    duplicateNotebook,
    getActiveId,
    getOrderedNotebooks,
    importNotebook,
    moveNotebook,
    renameNotebook,
    setActiveId,
  } from '../lib/state/notebook.svelte';
  import {
    getActiveProjectIndex,
    getProject,
    setActiveProjectIndex,
  } from '../lib/state/project.svelte';
  import { downloadNotebookMarkdown, parseImportedMarkdown, readFileAsText } from '../lib/io/md';

  let fileInput: HTMLInputElement | undefined = $state();
  const activeId = $derived(getActiveId());
  const ordered = $derived(getOrderedNotebooks());
  const project = $derived(getProject());
  const projectIndex = $derived(getActiveProjectIndex());

  function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60_000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    return `${days}d ago`;
  }

  function promptRename(id: string, current: string) {
    const next = prompt('Rename notebook', current);
    if (next && next.trim()) renameNotebook(id, next.trim());
  }

  function confirmDelete(id: string, title: string) {
    if (confirm(`Delete "${title}"?`)) deleteNotebook(id);
  }

  async function onImport(ev: Event) {
    const target = ev.currentTarget as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    const text = await readFileAsText(file);
    const { title, cells, gistId } = parseImportedMarkdown(text, file.name.replace(/\.md$/i, ''));
    importNotebook(title, cells, { gistId });
    target.value = '';
  }
</script>

<aside class="sidebar">
  {#if project}
    <div class="head">
      <h2>Project</h2>
      <div class="proj-name" title={`${project.target.owner}/${project.target.repo}`}>
        {project.title}
      </div>
      <div class="proj-meta">
        {project.target.owner}/{project.target.repo}@{project.target.ref}
      </div>
    </div>
    <ul class="list">
      {#each project.notebooks as nb, idx (nb.id)}
        <li class:active={idx === projectIndex}>
          <button type="button" class="entry" onclick={() => setActiveProjectIndex(idx)}>
            <div class="title">{nb.title}</div>
            <div class="meta">{nb.file}</div>
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="head">
      <h2>Notebooks</h2>
      <div class="head-actions">
        <button type="button" onclick={() => createNotebook()} title="New notebook">+ New</button>
        <button type="button" onclick={() => fileInput?.click()} title="Import .md">Import</button>
        <input
          type="file"
          accept=".md,text/markdown"
          bind:this={fileInput}
          onchange={onImport}
          hidden
        />
      </div>
    </div>
    <ul class="list">
      {#each ordered as nb, idx (nb.id)}
        <li class:active={nb.id === activeId}>
          <button type="button" class="entry" onclick={() => setActiveId(nb.id)}>
            <div class="title">{nb.title || 'Untitled'}</div>
            <div class="meta">Updated {timeAgo(nb.updatedAt)}</div>
          </button>
          <div class="row-actions">
            <button
              type="button"
              title="Move up"
              disabled={idx === 0}
              onclick={() => moveNotebook(nb.id, -1)}
              aria-label="Move up">▲</button
            >
            <button
              type="button"
              title="Move down"
              disabled={idx === ordered.length - 1}
              onclick={() => moveNotebook(nb.id, 1)}
              aria-label="Move down">▼</button
            >
            <button
              type="button"
              title="Rename"
              onclick={() => promptRename(nb.id, nb.title)}
              aria-label="Rename">✎</button
            >
            <button
              type="button"
              title="Duplicate"
              onclick={() => duplicateNotebook(nb.id)}
              aria-label="Duplicate">⎘</button
            >
            <button
              type="button"
              title="Export .md"
              onclick={() => downloadNotebookMarkdown(nb)}
              aria-label="Export Markdown">↓</button
            >
            <button
              type="button"
              class="danger"
              title="Delete"
              onclick={() => confirmDelete(nb.id, nb.title)}
              aria-label="Delete">×</button
            >
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</aside>

<style>
  .sidebar {
    width: 260px;
    flex-shrink: 0;
    background: #1a1d27;
    border-right: 1px solid #2e3350;
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .head {
    padding: 14px 14px 10px;
    border-bottom: 1px solid #2e3350;
  }
  .head h2 {
    margin: 0 0 8px;
    font-size: 12px;
    letter-spacing: 0.6px;
    color: #7c85a2;
    text-transform: uppercase;
  }
  .proj-name {
    font-size: 13px;
    font-weight: 600;
    color: #e2e8f0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .proj-meta {
    font-size: 11px;
    color: #7c85a2;
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .head-actions {
    display: flex;
    gap: 6px;
  }
  .head-actions button {
    background: #22263a;
    color: #e2e8f0;
    border: 1px solid #2e3350;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 11px;
    cursor: pointer;
  }
  .head-actions button:hover {
    background: #2e3350;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 6px 0;
    overflow-y: auto;
  }
  .list li {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0 8px;
  }
  .list li:hover {
    background: #22263a;
  }
  .list li.active {
    background: #22263a;
    border-left: 3px solid #f76e3c;
  }
  .entry {
    flex: 1;
    background: none;
    border: none;
    color: #e2e8f0;
    text-align: left;
    padding: 8px 6px;
    cursor: pointer;
    font: inherit;
  }
  .title {
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .meta {
    font-size: 11px;
    color: #7c85a2;
    margin-top: 2px;
  }
  .row-actions {
    display: none;
    gap: 2px;
  }
  .list li:hover .row-actions,
  .list li.active .row-actions {
    display: flex;
  }
  .row-actions button {
    background: transparent;
    border: none;
    color: #7c85a2;
    padding: 4px 6px;
    font-size: 13px;
    cursor: pointer;
    border-radius: 3px;
  }
  .row-actions button:hover {
    background: #2e3350;
    color: #e2e8f0;
  }
  .row-actions .danger:hover {
    background: #5a1f1f;
    color: #f87171;
  }
</style>
