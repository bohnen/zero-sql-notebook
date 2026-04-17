import type { Notebook } from './types';
import { newId } from './ids';
import { parseMarkdown } from './parse';

const WELCOME_SRC = [
  '# Welcome to Zero Notebook',
  '',
  'Define variables in the env cell and reference them with `${VAR}` in SQL cells.',
  '',
  '```env',
  '# DATABASE = test',
  '# TBL = information_schema.tables',
  '```',
  '',
  'Click ▶ Run on the SQL cell below (or press Cmd/Ctrl+Enter).',
  '',
  '```sql',
  'SELECT 1 AS hello;',
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
