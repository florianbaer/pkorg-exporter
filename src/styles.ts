import type { RowKind } from './types.ts';

export const ROW_KIND = {
  TITLE: 'title',
  META: 'meta',
  SPACER: 'spacer',
  HEADER: 'header',
  DATA: 'data',
} as const satisfies Record<string, RowKind>;

export const COL_WIDTHS = [180, 200, 250, 250, 150, 150, 150, 60, 250] as const;
export const SCORE_COL_INDEX = 7;

export const BUTTON_CSS = `
    background: #1d6f42;
    color: #fff;
    border: none;
    padding: 6px 14px;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    margin-left: 12px;
    font-family: Arial, sans-serif;
    vertical-align: middle;
  `;

export const XLS_STYLES_XML = `
  <Style ss:ID="header">
   <Alignment ss:WrapText="1"/>
   <Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="11"/>
   <Interior ss:Color="#1d6f42" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="title">
   <Font ss:Bold="1" ss:Size="13"/>
  </Style>
  <Style ss:ID="normal">
   <Alignment ss:WrapText="1" ss:Vertical="Top"/>
  </Style>
  <Style ss:ID="score">
   <Alignment ss:Horizontal="Center" ss:Vertical="Top"/>
   <Font ss:Bold="1" ss:Size="12"/>
  </Style>`;

export const HEADER_LABELS = [
  'Section',
  'Criterion',
  'Description',
  'Quality Level 3',
  'Quality Level 2',
  'Quality Level 1',
  'Quality Level 0',
  'Points (0–3)',
  'Comment',
] as const;
