export interface ExtractedDataRow {
  [key: string]: string | number | boolean | null;
}

export interface ExtractionResult {
  headers: string[];
  rows: ExtractedDataRow[];
}

export type ExtractionStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export interface AlertState {
  type: 'success' | 'error' | 'info';
  message: string;
}
