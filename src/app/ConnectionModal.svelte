<script lang="ts">
  import type { Instance } from '../lib/instance/client';
  import { parseConnectionString } from '../lib/instance/client';
  import { copyToClipboard } from '../lib/result/export';
  import { isReprovisioning, reprovisionInstance } from '../lib/state/instance.svelte';

  interface Props {
    instance: Instance;
    onClose: () => void;
    onReprovisioned?: (next: Instance) => void;
  }

  let { instance, onClose, onReprovisioned }: Props = $props();
  let copyNote = $state<string | null>(null);
  let error = $state<string | null>(null);
  const busy = $derived(isReprovisioning());

  const parsed = $derived(parseConnectionString(instance.connectionString));
  const daysLeft = $derived(
    Math.max(0, (new Date(instance.expiresAt).getTime() - Date.now()) / 86_400_000),
  );

  async function onCopy() {
    try {
      await copyToClipboard(instance.connectionString);
      copyNote = 'Copied';
      setTimeout(() => (copyNote = null), 1500);
    } catch (err) {
      copyNote = err instanceof Error ? err.message : String(err);
    }
  }

  async function onReprovision() {
    if (busy) return;
    if (!confirm('Reprovision a new TiDB instance? Existing data will be lost.')) return;
    error = null;
    try {
      const next = await reprovisionInstance();
      onReprovisioned?.(next);
      onClose();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }
</script>

<div
  class="overlay"
  role="button"
  tabindex="-1"
  onclick={onClose}
  onkeydown={(e) => e.key === 'Escape' && onClose()}
>
  <div
    class="modal"
    role="dialog"
    aria-modal="true"
    aria-label="Connection info"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    tabindex="-1"
  >
    <header>
      <h2>TiDB Cloud Zero</h2>
      <button type="button" class="close" onclick={onClose} aria-label="Close">×</button>
    </header>
    <dl>
      <dt>Host</dt>
      <dd><code>{parsed.host}</code></dd>
      <dt>Database</dt>
      <dd><code>{parsed.database}</code></dd>
      <dt>Connection string</dt>
      <dd class="connstr">
        <code>{instance.connectionString}</code>
        <button type="button" class="act" onclick={onCopy}>Copy</button>
        {#if copyNote}<span class="note">{copyNote}</span>{/if}
      </dd>
      <dt>Expires</dt>
      <dd>
        {new Date(instance.expiresAt).toLocaleString()} ({daysLeft.toFixed(1)} days left)
      </dd>
      {#if instance.claimInfo?.claimUrl}
        <dt>Claim</dt>
        <dd>
          <a href={instance.claimInfo.claimUrl} target="_blank" rel="noreferrer"
            >Claim this instance permanently</a
          >
        </dd>
      {/if}
    </dl>
    {#if error}
      <p class="error">{error}</p>
    {/if}
    <footer>
      <button type="button" class="danger" disabled={busy} onclick={onReprovision}>
        {busy ? 'Reprovisioning…' : 'Reprovision'}
      </button>
      <button type="button" onclick={onClose}>Close</button>
    </footer>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 17, 23, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    border: none;
    padding: 0;
  }
  .modal {
    background: #1a1d27;
    border: 1px solid #2e3350;
    border-radius: 8px;
    width: min(560px, 96vw);
    color: #e2e8f0;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  header h2 {
    margin: 0;
    font-size: 15px;
  }
  .close {
    background: transparent;
    color: #7c85a2;
    border: none;
    font-size: 20px;
    cursor: pointer;
    padding: 4px 8px;
  }
  .close:hover {
    color: #e2e8f0;
  }
  dl {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 6px 12px;
    margin: 0;
    font-size: 12px;
  }
  dt {
    color: #7c85a2;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.4px;
    padding-top: 2px;
  }
  dd {
    margin: 0;
    word-break: break-all;
  }
  code {
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    background: #22263a;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 11px;
  }
  .connstr {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
  }
  .connstr code {
    word-break: break-all;
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
  .note {
    color: #4ade80;
    font-size: 11px;
  }
  .error {
    color: #f87171;
    font-size: 12px;
    margin: 0;
    padding: 6px 8px;
    border: 1px solid #5a1f1f;
    background: #2a1414;
    border-radius: 4px;
  }
  footer {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  footer button {
    background: #22263a;
    color: #e2e8f0;
    border: 1px solid #2e3350;
    border-radius: 4px;
    font-size: 12px;
    padding: 6px 14px;
    cursor: pointer;
    font-weight: 600;
  }
  footer button:hover:not(:disabled) {
    background: #2e3350;
  }
  footer button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .danger {
    background: #5a1f1f;
    color: #f87171;
    border-color: #f87171;
  }
  .danger:hover:not(:disabled) {
    background: #6a2626;
  }
  a {
    color: #60a5fa;
  }
</style>
