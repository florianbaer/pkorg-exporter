import { COL_WIDTHS, ROW_KIND, SCORE_COL_INDEX, XLS_STYLES_XML } from './styles.ts';
import type { CellValue, Row, RowKind } from './types.ts';

export function xmlEscape(raw: string): string {
  // Only escape what XML element text requires. Cell data goes into element
  // text (not attribute values), so " and ' pass through unchanged — matching
  // Excel 2003 XML convention and the original content.js behavior.
  return raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function isNumeric(raw: unknown): boolean {
  if (typeof raw === 'number') return Number.isFinite(raw);
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (trimmed === '') return false;
  return Number.isFinite(Number(trimmed));
}

type CellStyle = 'title' | 'header' | 'normal' | 'score' | null;

const ROW_STYLE: Record<RowKind, string | null> = {
  title: null,
  meta: null,
  spacer: null,
  header: 'header',
  data: null,
};

function cellStyle(kind: RowKind, cellIndex: number): CellStyle {
  if (kind === ROW_KIND.TITLE) return cellIndex === 0 ? 'title' : null;
  if (kind === ROW_KIND.DATA) return cellIndex === SCORE_COL_INDEX ? 'score' : 'normal';
  return null;
}

function renderCell(raw: CellValue, style: CellStyle): string {
  const type = isNumeric(raw) ? 'Number' : 'String';
  const escaped = xmlEscape(String(raw));
  const styleAttr = style ? ` ss:StyleID="${style}"` : '';
  return `<Cell${styleAttr}><Data ss:Type="${type}">${escaped}</Data></Cell>`;
}

function renderRow(row: Row): string {
  const rowStyle = ROW_STYLE[row.kind];
  const rowStyleAttr = rowStyle ? ` ss:StyleID="${rowStyle}"` : '';
  if (row.cells.length === 0) return `<Row${rowStyleAttr}></Row>`;
  const cells = row.cells.map((cell, i) => renderCell(cell, cellStyle(row.kind, i))).join('');
  return `<Row${rowStyleAttr}>${cells}</Row>`;
}

export function rowsToXLS(rows: ReadonlyArray<Row>): string {
  const columns = COL_WIDTHS.map((w) => `\n   <Column ss:Width="${w}"/>`).join('');
  const body = rows.map((r) => `\n   ${renderRow(r)}`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>${XLS_STYLES_XML}
 </Styles>
 <Worksheet ss:Name="Bewertung">
  <Table>${columns}${body}
  </Table>
 </Worksheet>
</Workbook>`;
}

export function downloadXLS(rows: ReadonlyArray<Row>, name: string): void {
  const xml = rowsToXLS(rows);
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bewertung_${name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
