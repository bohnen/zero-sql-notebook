<script lang="ts">
  import type { Instance } from '../lib/instance/client';

  interface Props {
    instance: Instance;
    onOpen: () => void;
  }

  let { instance, onOpen }: Props = $props();
  const daysLeft = $derived(
    Math.max(0, (new Date(instance.expiresAt).getTime() - Date.now()) / 86_400_000),
  );
  const warn = $derived(daysLeft < 1);
  const label = $derived(
    daysLeft >= 1
      ? `expires in ${Math.floor(daysLeft)}d`
      : daysLeft >= 0
        ? `expires in ${Math.floor(daysLeft * 24)}h`
        : 'expired',
  );
</script>

<button type="button" class="badge" class:warn onclick={onOpen} title="Connection info">
  <span class="dot" class:warn></span>
  <span class="text">connected</span>
  <span class="sep">·</span>
  <span class="expiry">{label}</span>
</button>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #22263a;
    color: #e2e8f0;
    border: 1px solid #2e3350;
    border-radius: 20px;
    padding: 4px 12px;
    font-size: 11px;
    cursor: pointer;
  }
  .badge:hover {
    background: #2e3350;
  }
  .badge.warn {
    border-color: #fbbf24;
    color: #fbbf24;
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #4ade80;
    animation: pulse 2s infinite;
  }
  .dot.warn {
    background: #fbbf24;
  }
  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }
  .sep {
    color: #4a5180;
  }
  .expiry {
    color: #7c85a2;
  }
  .badge.warn .expiry {
    color: #fbbf24;
  }
</style>
