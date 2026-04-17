export function splitStatements(sql: string): string[] {
  const stripped = sql.replace(/--[^\n]*/g, '');
  return stripped
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
