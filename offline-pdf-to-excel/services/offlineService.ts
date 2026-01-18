import * as pdfjsLib from 'pdfjs-dist';
import { ExtractionResult, ExtractedDataRow } from "../types";

// Access the library object correctly, handling potential default export wrapping
const pdf = (pdfjsLib as any).default || pdfjsLib;

// Configure the worker using cdnjs
if (pdf.GlobalWorkerOptions) {
  pdf.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
} else {
  console.warn("Could not find GlobalWorkerOptions in pdfjs-dist import. Worker might not be configured correctly.");
}

interface PDFTextItem {
  str: string;
  transform: number[]; // [scaleX, skewY, skewX, scaleY, translateX, translateY]
  width: number;
  height: number;
}

interface TextElement {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Helper to sanitize sensitive PII data using Regex patterns AND custom terms
export const applySanitization = (
  rows: ExtractedDataRow[], 
  useDefaultPatterns: boolean, 
  customTerms: string[]
): ExtractedDataRow[] => {
  if (!useDefaultPatterns && customTerms.length === 0) return rows;

  return rows.map(row => {
    const newRow: ExtractedDataRow = {};
    Object.keys(row).forEach(key => {
      let val = row[key];
      if (typeof val !== 'string') {
        newRow[key] = val;
        return;
      }

      let text = val;

      // 1. Apply Custom Terms (Case insensitive)
      customTerms.forEach(term => {
        if (!term) return;
        // Escape regex special characters in the user term
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedTerm}\\b|${escapedTerm}`, 'gi');
        text = text.replace(regex, '[HIDDEN]');
      });

      // 2. Apply Default Patterns if enabled
      if (useDefaultPatterns) {
        // Email
        text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
        // Phone
        text = text.replace(/(?:(?:\+|00)\d{1,3}[\s.-]{0,3}(?:\(?[0-9]\d{1,4}\)?[\s.-]{0,3})?|0)[1-9]\d{2}[\s.-]{0,3}\d{3}[\s.-]{0,3}\d{4}/g, '[PHONE]');
        // Cards/IDs
        text = text.replace(/\b(?:\d[ -]*?){13,19}\b/g, '[CARD/ID]');
        // Dates
        text = text.replace(/\b\d{1,4}[-./]\d{1,2}[-./]\d{2,4}\b/g, '[DATE]');
        // SSN
        text = text.replace(/\b\d{3}[-]\d{2}[-]\d{4}\b/g, '[SSN]');
      }

      newRow[key] = text;
    });
    return newRow;
  });
};

// Helper to cluster values (e.g., finding common X or Y coordinates)
const clusterValues = (values: number[], tolerance: number): number[] => {
  if (values.length === 0) return [];
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  const clusters: number[] = [];
  if (sorted.length === 0) return [];

  let currentClusterSum = sorted[0];
  let currentClusterCount = 1;
  let lastVal = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - lastVal < tolerance) {
      currentClusterSum += sorted[i];
      currentClusterCount++;
    } else {
      clusters.push(currentClusterSum / currentClusterCount);
      currentClusterSum = sorted[i];
      currentClusterCount = 1;
    }
    lastVal = sorted[i];
  }
  clusters.push(currentClusterSum / currentClusterCount);
  return clusters;
};

// Main parsing function - returns RAW data. Sanitization is now separate.
export const processFileOffline = async (fileArrayBuffer: ArrayBuffer): Promise<ExtractionResult> => {
  try {
    const loadingTask = pdf.getDocument({ data: fileArrayBuffer });
    const pdfDocument = await loadingTask.promise;
    
    let allRows: ExtractedDataRow[] = [];
    
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const elements: TextElement[] = [];

      for (const item of textContent.items) {
        if (!('str' in item)) continue;
        const textItem = item as unknown as PDFTextItem;
        const str = textItem.str.trim();
        if (str.length === 0) continue;

        elements.push({
          str: str,
          x: textItem.transform[4],
          y: textItem.transform[5],
          width: textItem.width,
          height: textItem.height
        });
      }

      if (elements.length === 0) continue;

      const yCoords = elements.map(e => e.y);
      const uniqueRowYs = clusterValues(yCoords, 8).sort((a, b) => b - a);

      const xCoords = elements.map(e => e.x);
      const uniqueColXs = clusterValues(xCoords, 10).sort((a, b) => a - b);

      const grid: string[][] = Array(uniqueRowYs.length).fill(null).map(() => Array(uniqueColXs.length).fill(""));

      elements.forEach(el => {
        let closestRowIdx = -1;
        let minRowDist = Infinity;
        uniqueRowYs.forEach((rowY, idx) => {
          const dist = Math.abs(el.y - rowY);
          if (dist < minRowDist) {
            minRowDist = dist;
            closestRowIdx = idx;
          }
        });

        let closestColIdx = -1;
        let minColDist = Infinity;
        uniqueColXs.forEach((colX, idx) => {
          const dist = Math.abs(el.x - colX);
          if (dist < minColDist) {
            minColDist = dist;
            closestColIdx = idx;
          }
        });

        if (closestRowIdx !== -1 && closestColIdx !== -1) {
          const current = grid[closestRowIdx][closestColIdx];
          grid[closestRowIdx][closestColIdx] = current ? current + " " + el.str : el.str;
        }
      });

      const pageRows: ExtractedDataRow[] = grid.map(row => {
        const dataRow: ExtractedDataRow = {};
        row.forEach((cellText, colIdx) => {
          if (cellText) {
            dataRow[`Column ${colIdx + 1}`] = cellText;
          }
        });
        return dataRow;
      });

      const nonEmptyRows = pageRows.filter(row => Object.keys(row).length > 0);
      allRows = [...allRows, ...nonEmptyRows];
    }

    if (allRows.length === 0) {
      return { headers: [], rows: [] };
    }

    let maxCols = 0;
    allRows.forEach(row => {
      Object.keys(row).forEach(key => {
        const colNum = parseInt(key.replace('Column ', ''));
        if (colNum > maxCols) maxCols = colNum;
      });
    });

    const globalHeaders = Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`);

    const normalizedRows = allRows.map(row => {
      const newRow: ExtractedDataRow = {};
      globalHeaders.forEach(header => {
        newRow[header] = row[header] || "";
      });
      return newRow;
    });

    return {
      headers: globalHeaders,
      rows: normalizedRows
    };

  } catch (error) {
    console.error("Offline Parsing Error:", error);
    throw new Error("Failed to parse PDF locally. Ensure the file is not corrupted.");
  }
};