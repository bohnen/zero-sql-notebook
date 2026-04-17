<script lang="ts">
  interface Props {
    status: 'provisioning' | 'error';
    message?: string;
    onRetry?: () => void;
  }

  let { status, message, onRetry }: Props = $props();
</script>

<div class="splash" role="status" aria-live="polite">
  {#if status === 'provisioning'}
    <div class="spinner"></div>
    <p class="label">{message ?? 'Connecting to TiDB Cloud Zero…'}</p>
  {:else}
    <div class="error">
      <strong>Failed to provision instance</strong>
      {#if message}<p>{message}</p>{/if}
      {#if onRetry}
        <button type="button" onclick={onRetry}>Retry</button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .splash {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    background: #0f1117;
    z-index: 100;
  }
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #2e3350;
    border-top-color: #f76e3c;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .label {
    color: #7c85a2;
    font-size: 14px;
  }
  .error {
    max-width: 460px;
    background: #2a1414;
    border: 1px solid #f87171;
    border-radius: 8px;
    padding: 16px 20px;
    color: #f87171;
    text-align: center;
    line-height: 1.6;
  }
  .error p {
    margin: 10px 0;
    font-size: 13px;
  }
  .error button {
    margin-top: 6px;
    padding: 7px 18px;
    background: #f76e3c;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
  }
</style>
