<script lang="ts">
  import type { SqlResult } from '../../lib/execute/run';

  interface Props {
    result: SqlResult | null;
    elapsedMs: number | null;
    error: string | null;
    running: boolean;
  }

  let { result, elapsedMs, error, running }: Props = $props();

  const NUMERIC_TYPE_RE = /int|float|double|decimal|bigint|tinyint|smallint/i;

  function isNumeric(type: string | undefined): boolean {
    return !!type && NUMERIC_TYPE_RE.test(type);
  }

  function renderValue(v: unknown): string {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  const hasRows = $derived(
    result != null && Array.isArray(result.types) && Array.isArray(result.rows),
  );
</script>

<div class="panel" class:running>
  {#if error}
    <div class="meta error">
      <strong>Error</strong>
      <span>{error}</span>
    </div>
  {:else if running && !result}
    <div class="meta"><span class="mini-spinner"></span> Running…</div>
  {:else if result}
    <div class="meta">
      {#if elapsedMs != null}
        <span>elapsed {elapsedMs} ms</span>
      {/if}
      {#if hasRows}
        <span>·</span>
        <span>{result.rows?.length ?? 0} rows</span>
      {:else if result.rowsAffected != null}
        <span>·</span>
        <span>{result.rowsAffected} rows affected</span>
      {/if}
    </div>
    {#if hasRows}
      <div class="scroll">
        <table>
          <thead>
            <tr>
              {#each result.types ?? [] as col (col.name)}
                <th class={isNumeric(col.type) ? 'num' : 'str'}>
                  <span class="col-name">{col.name}</span>
                  <span class="col-type">{col.type ?? ''}</span>
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each result.rows ?? [] as row, rowIdx (rowIdx)}
              <tr>
                {#each row as val, colIdx (colIdx)}
                  {@const type = result.types?.[colIdx]?.type}
                  {#if val === null || val === undefined}
                    <td class="null"><em>null</em></td>
                  {:else}
                    <td class={isNumeric(type) ? 'num' : 'str'}>{renderValue(val)}</td>
                  {/if}
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>

<style>
  .panel {
    margin-top: 8px;
    border: 1px solid #2e3350;
    border-radius: 4px;
    background: #191c2a;
    padding: 8px 10px;
  }
  .meta {
    display: flex;
    gap: 8px;
    font-size: 12px;
    color: #7c85a2;
    align-items: center;
  }
  .meta.error {
    color: #f87171;
  }
  .meta.error strong {
    margin-right: 4px;
  }
  .mini-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid #2e3350;
    border-top-color: #f76e3c;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    display: inline-block;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .scroll {
    max-height: 360px;
    overflow: auto;
    margin-top: 8px;
    border: 1px solid #22263a;
    border-radius: 4px;
  }
  table {
    border-collapse: collapse;
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    font-size: 12px;
    width: 100%;
  }
  th,
  td {
    padding: 4px 8px;
    border-bottom: 1px solid #22263a;
    white-space: nowrap;
  }
  thead th {
    position: sticky;
    top: 0;
    background: #1a1d27;
    color: #e2e8f0;
    text-align: left;
    border-bottom: 1px solid #2e3350;
  }
  .col-name {
    font-weight: 600;
  }
  .col-type {
    color: #7c85a2;
    font-weight: 400;
    margin-left: 6px;
    font-size: 11px;
  }
  td.num {
    text-align: right;
    color: #60a5fa;
  }
  td.str {
    color: #4ade80;
  }
  td.null {
    color: #4a5180;
  }
</style>
