<script lang="ts">
  interface Props {
    source: string;
    onChange: (next: string) => void;
  }

  let { source, onChange }: Props = $props();
</script>

<textarea value={source} oninput={(e) => onChange((e.currentTarget as HTMLTextAreaElement).value)}
></textarea>

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
</style>
