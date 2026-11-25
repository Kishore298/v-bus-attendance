import { stringify } from 'csv-stringify/sync';

export function buildCsv(rows, columns) {
  return stringify(rows, {
    header: true,
    columns,
  });
}
