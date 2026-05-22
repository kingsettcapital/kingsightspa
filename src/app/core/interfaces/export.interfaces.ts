export type ExportColumn<T> = {
  header: string;
  value: (row: T) => string | number | boolean;
};

export type TableExportOptions<T> = {
  filename: string;
  columns: ExportColumn<T>[];
  rows: T[];
  sheetName?: string;
  title?: string;
};
