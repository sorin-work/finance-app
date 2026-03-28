/**
 * Minimal RFC 4180 CSV reading and writing: quoted fields, escaped quotes,
 * commas and newlines inside quotes, CRLF or LF line endings and a UTF-8 BOM.
 */

function escapeField(value: string): string {
  return /[",\r\n]/.test(value) || value.trim() !== value
    ? `"${value.replace(/"/g, '""')}"`
    : value;
}

export function toCsv(rows: ReadonlyArray<ReadonlyArray<string | number>>): string {
  return rows.map((row) => row.map((v) => escapeField(String(v))).join(',')).join('\r\n') + '\r\n';
}

export function parseCsv(text: string): string[][] {
  const input = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field === '') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Ignore blank lines.
  return rows.filter((r) => r.some((value) => value.trim() !== ''));
}
