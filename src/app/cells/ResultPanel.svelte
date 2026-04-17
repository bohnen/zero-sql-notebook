<script lang="ts">
  import type { SqlResult } from '../../lib/execute/run';
  import {
    ROW_RENDER_LIMIT,
    copyToClipboard,
    downloadBlob,
    toCsv,
    toMarkdownTable,
  } from '../../lib/result/export';

  interface Props {
    result: SqlResult | null;
    elapsedMs: number | null;
    error: string | null;
    running: boolean;
    cellIndex?: number;
    notebookTitle?: string;
  }

  let {
    result,
    elapsedMs,
    error,
    running,
    cellIndex = 0,
    notebookTitle = 'notebook',
  }: Props = $props();

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
  const totalRows = $derived(result?.rows?.length ?? 0);
  const renderedRows = $derived(result?.rows?.slice(0, ROW_RENDER_LIMIT) ?? []);
  const hasOverflow = $derived(totalRows > ROW_RENDER_LIMIT);

  function filename(ext: string): string {
    const slug =
      notebookTitle
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-') || 'notebook';
    const ts = new Date().toISOString().replace(/[:.-]/g, '').replace(/T/, '-').slice(0, 15);
    return `${slug}_${cellIndex}_${ts}.${ext}`;
  }

  let copyNote = $state<string | null>(null);

  function onDownloadCsv() {
    if (!result?.types || !result?.rows) return;
    const csv = toCsv(result.types, result.rows);
    downloadBlob(filename('csv'), csv, 'text/csv');
  }

  async function onCopyMarkdown() {
    if (!result?.types || !result?.rows) return;
    const md = toMarkdownTable(result.types, result.rows);
    try {
      await copyToClipboard(md);
      copyNote = 'Copied';
      setTimeout(() => (copyNote = null), 1500);
    } catch (err) {
      copyNote = `Copy failed: ${err instanceof Error ? err.message : String(err)}`;
      setTimeout(() => (copyNote = null), 3000);
    }
  }
</script>

<div class="panel" class:running>
  {#if error}
    <div class="meta error">
      <strong>Error</strong>
      <pre class="error-body">{error}</pre>
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
        <span
          >{totalRows} row{totalRows === 1 ? '' : 's'}{hasOverflow
            ? ` (showing first ${ROW_RENDER_LIMIT.toLocaleString()})`
            : ''}</span
        >
        <span class="spacer"></span>
        <button type="button" class="act" onclick={onDownloadCsv} title="Download CSV">CSV</button>
        <button type="button" class="act" onclick={onCopyMarkdown} title="Copy as Markdown table">
          Copy MD
        </button>
        {#if copyNote}<span class="note">{copyNote}</span>{/if}
      {:else if result.rowsAffected != null}
        <span>·</span>
        <span>{result.rowsAffected} rows affected</span>
      {:else}
        <span>·</span>
        <span>ok</span>
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
            {#each renderedRows as row, rowIdx (rowIdx)}
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
      {#if hasOverflow}
        <div class="overflow">
          Only the first {ROW_RENDER_LIMIT.toLocaleString()} rows are rendered. Consider adding
          <code>LIMIT</code> or use <strong>CSV</strong> to export all {totalRows.toLocaleString()} rows.
        </div>
      {/if}
    {:else}
      <pre class="raw-output">{JSON.stringify(result, null, 2)}</pre>
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
    flex-wrap: wrap;
  }
  .meta.error {
    color: #f87171;
    align-items: flex-start;
    flex-wrap: nowrap;
  }
  .meta.error strong {
    margin-right: 4px;
    padding-top: 2px;
    flex-shrink: 0;
  }
  .error-body {
    margin: 0;
    padding: 4px 6px;
    background: #2a1414;
    border: 1px solid #5a1f1f;
    border-radius: 3px;
    color: #f87171;
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 240px;
    overflow: auto;
    flex: 1;
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
  .spacer {
    flex: 1;
  }
  .act {
    background: #22263a;
    color: #e2e8f0;
    border: 1px solid #2e3350;
    border-radius: 3px;
    font-size: 11px;
    padding: 2px 8px;
    cursor: pointer;
  }
  .act:hover {
    background: #2e3350;
  }
  .note {
    font-size: 11px;
    color: #4ade80;
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
  .overflow {
    margin-top: 6px;
    padding: 6px 8px;
    background: #2a2414;
    border: 1px solid #fbbf24;
    color: #fbbf24;
    border-radius: 4px;
    font-size: 11px;
    line-height: 1.4;
  }
  .overflow code {
    background: #1a1d27;
    padding: 1px 4px;
    border-radius: 3px;
  }
  .raw-output {
    margin: 8px 0 0;
    padding: 8px 10px;
    background: #191c2a;
    border: 1px solid #22263a;
    border-radius: 4px;
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.5;
    color: #e2e8f0;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 360px;
    overflow: auto;
  }
</style>
