import type { Notebook } from './types';
import { newId } from './ids';
import { parseMarkdown } from './parse';

const WELCOME_SRC = [
  '# Welcome to Zero Notebook',
  '',
  'Click ▶ Run on the SQL cell below (or press Cmd/Ctrl+Enter).',
  '',
  '```sql',
  'SELECT 1 AS hello;',
  '```',
  '',
  '```env',
  '# Variables are not wired up yet (M1).',
  '```',
].join('\n');

export function createInitialNotebook(): Notebook {
  const now = new Date().toISOString();
  const { cells } = parseMarkdown(WELCOME_SRC);
  return {
    id: newId(),
    title: 'Welcome',
    cells,
    createdAt: now,
    updatedAt: now,
  };
}
