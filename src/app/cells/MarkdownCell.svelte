<script lang="ts">
  import DOMPurify from 'dompurify';
  import { marked } from 'marked';

  interface Props {
    source: string;
    onChange: (next: string) => void;
    readOnly?: boolean;
  }

  let { source, onChange, readOnly = false }: Props = $props();
  let editing = $state(false);
  const rendered = $derived(DOMPurify.sanitize(marked.parse(source, { async: false }) as string));
</script>

{#if editing && !readOnly}
  <!-- svelte-ignore a11y_autofocus -->
  <textarea
    value={source}
    autofocus
    oninput={(e) => onChange((e.currentTarget as HTMLTextAreaElement).value)}
    onblur={() => (editing = false)}
  ></textarea>
{:else}
  <button
    type="button"
    class="preview"
    aria-label={readOnly ? 'Markdown preview' : 'Edit markdown'}
    disabled={readOnly}
    onclick={() => !readOnly && (editing = true)}
  >
    {#if source.trim() === ''}
      <span class="placeholder">{readOnly ? 'Empty' : 'Click to edit markdown…'}</span>
    {:else}
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html rendered}
    {/if}
  </button>
{/if}

<style>
  textarea {
    width: 100%;
    min-height: 60px;
    background: #191c2a;
    color: #e2e8f0;
    border: 1px solid #2e3350;
    border-radius: 4px;
    padding: 8px;
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    font-size: 13px;
    resize: vertical;
  }
  .preview {
    display: block;
    width: 100%;
    min-height: 40px;
    text-align: left;
    background: transparent;
    color: #e2e8f0;
    border: 1px dashed transparent;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: text;
    font: inherit;
  }
  .preview:hover {
    border-color: #2e3350;
  }
  .placeholder {
    color: #4a5180;
    font-style: italic;
  }
  .preview :global(h1) {
    font-size: 22px;
    margin: 8px 0;
  }
  .preview :global(h2) {
    font-size: 18px;
    margin: 8px 0;
  }
  .preview :global(h3) {
    font-size: 16px;
    margin: 6px 0;
  }
  .preview :global(p) {
    margin: 6px 0;
    line-height: 1.55;
  }
  .preview :global(code) {
    background: #22263a;
    padding: 1px 6px;
    border-radius: 3px;
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    font-size: 12px;
  }
  .preview :global(a) {
    color: #60a5fa;
  }
</style>
