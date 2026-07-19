/**
 * Serialize one CSV cell safely for RFC-4180 consumers and spreadsheet apps.
 *
 * A leading formula character in user-controlled text can be interpreted as
 * a spreadsheet formula when an export is opened in Excel/Sheets. Prefixing
 * those strings with an apostrophe keeps the value visible while preventing
 * formula execution.
 */
export function escapeCsvCell(value: unknown): string {
  let cell = value instanceof Date ? value.toISOString() : String(value ?? "");

  if (/^[\t\r ]*[=+\-@]/.test(cell)) {
    cell = `'${cell}`;
  }

  return /[,"\r\n]/.test(cell)
    ? `"${cell.replace(/"/g, '""')}"`
    : cell;
}
