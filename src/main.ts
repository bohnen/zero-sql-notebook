import { mount } from 'svelte';
import App from './app/App.svelte';
import { initAutoSave } from './lib/state/notebook.svelte';
import { flushSave } from './lib/storage/store';

const target = document.getElementById('app');
if (!target) {
  throw new Error('Missing #app mount point');
}

initAutoSave();
window.addEventListener('beforeunload', flushSave);

mount(App, { target });
