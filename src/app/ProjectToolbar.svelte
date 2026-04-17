<script lang="ts">
  import type { LoadedProject } from '../lib/project/github';
  import { importNotebook, setActiveId } from '../lib/state/notebook.svelte';
  import { clearProject } from '../lib/state/project.svelte';

  interface Props {
    project: LoadedProject;
  }

  let { project }: Props = $props();

  function sourceUrl(): string {
    const { owner, repo, ref, path } = project.target;
    const tail = path ? `/tree/${ref}/${path}` : `/tree/${ref}`;
    return `https://github.com/${owner}/${repo}${tail}`;
  }

  function onCopyAll() {
    if (!confirm(`Copy ${project.notebooks.length} notebooks into My Notebooks?`)) return;
    let firstId: string | null = null;
    for (const nb of project.notebooks) {
      const id = importNotebook(nb.title, nb.cells);
      if (!firstId) firstId = id;
    }
    clearProject();
    if (firstId) setActiveId(firstId);
  }
</script>

<div class="bar">
  <span class="badge">Project</span>
  <a class="link" href={sourceUrl()} target="_blank" rel="noreferrer">
    {project.target.owner}/{project.target.repo}@{project.target.ref}
  </a>
  <button type="button" class="primary" onclick={onCopyAll}>Copy all</button>
  <button type="button" class="ghost" onclick={clearProject} title="Close project view">✕</button>
</div>

<style>
  .bar {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .badge {
    background: #1b2c22;
    color: #4ade80;
    border: 1px solid #2b5a3a;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
  }
  .link {
    color: #60a5fa;
    font-size: 11px;
    text-decoration: none;
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  }
  .link:hover {
    text-decoration: underline;
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
