<script lang="ts">
  import { dismiss, getToasts } from '../lib/state/toast.svelte';

  const toasts = $derived(getToasts());
</script>

<div class="stack">
  {#each toasts as toast (toast.id)}
    <div class="toast">
      <span class="msg">{toast.message}</span>
      {#if toast.undo}
        <button
          type="button"
          onclick={() => {
            toast.undo?.();
            dismiss(toast.id);
          }}>Undo</button
        >
      {/if}
      <button type="button" class="close" aria-label="Dismiss" onclick={() => dismiss(toast.id)}
        >×</button
      >
    </div>
  {/each}
</div>

<style>
  .stack {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 150;
  }
  .toast {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #22263a;
    border: 1px solid #2e3350;
    color: #e2e8f0;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
  }
  .msg {
    white-space: nowrap;
  }
  button {
    background: transparent;
    border: 1px solid #2e3350;
    color: #e2e8f0;
    border-radius: 3px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }
  button:hover {
    background: #2e3350;
  }
  .close {
    border: none;
    color: #7c85a2;
    padding: 2px 6px;
    font-size: 14px;
  }
</style>
