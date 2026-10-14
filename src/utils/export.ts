/**
 * Client export utilities for generating JSON and structured reports.
 */

/**
 * Trigger a browser file download from a string content or object.
 */
export function downloadFile(content: string, filename: string, mimeType = 'application/json'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export object as formatted JSON file.
 */
export function exportAsJson(data: unknown, filename: string): void {
  const jsonString = JSON.stringify(data, null, 2);
  downloadFile(jsonString, filename.endsWith('.json') ? filename : `${filename}.json`, 'application/json');
}

/**
 * Export tabular data as a clean CSV string.
 */
export function exportAsCsv(rows: Record<string, any>[], filename: string): void {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          const str = val === null || val === undefined ? '' : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(',')
    )
  ];
  downloadFile(csvLines.join('\n'), filename.endsWith('.csv') ? filename : `${filename}.csv`, 'text/csv');
}
