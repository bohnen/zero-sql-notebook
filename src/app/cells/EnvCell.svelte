<script lang="ts">
  import { parseEnv } from '../../lib/env/parse';

  interface Props {
    source: string;
    onChange: (next: string) => void;
    readOnly?: boolean;
  }

  let { source, onChange, readOnly = false }: Props = $props();
  const parsed = $derived(parseEnv(source));
  const varCount = $derived(Object.keys(parsed.values).length);
</script>

<textarea
  value={source}
  readonly={readOnly}
  oninput={(e) => onChange((e.currentTarget as HTMLTextAreaElement).value)}
></textarea>

<div class="meta" class:has-errors={parsed.errors.length > 0}>
  <span class="count">{varCount} variable{varCount === 1 ? '' : 's'}</span>
  {#if parsed.errors.length > 0}
    <ul class="errors">
      {#each parsed.errors as err (err.line)}
        <li>line {err.line}: {err.reason}</li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  textarea {
    width: 100%;
    min-height: 40px;
    background: #191c2a;
    color: #e2e8f0;
    border: 1px solid #2e3350;
    border-radius: 4px;
    padding: 8px;
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    font-size: 13px;
    resize: vertical;
  }
  .meta {
    margin-top: 6px;
    font-size: 11px;
    color: #7c85a2;
  }
  .meta.has-errors {
    color: #f87171;
  }
  .count {
    display: inline-block;
  }
  .errors {
    margin: 4px 0 0;
    padding-left: 16px;
    color: #f87171;
  }
  .errors li {
    list-style: disc;
  }
</style>
