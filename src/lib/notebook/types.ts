export type CellType = 'markdown' | 'sql' | 'env';

export interface CellBase {
  id: string;
  type: CellType;
  source: string;
}

export type Cell = CellBase;

export interface Notebook {
  id: string;
  title: string;
  cells: Cell[];
  gistId?: string;
  createdAt: string;
  updatedAt: string;
}
