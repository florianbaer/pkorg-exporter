import { describe, expect, test } from 'bun:test';
import { ROW_KIND } from './styles.ts';
import type { Row } from './types.ts';
import { isNumeric, rowsToXLS, xmlEscape } from './xls.ts';

describe('xmlEscape', () => {
  test('escapes &, <, >', () => {
    expect(xmlEscape('a & b <c> d')).toBe('a &amp; b &lt;c&gt; d');
  });

  test('leaves quotes and apostrophes untouched (element text, not attribute)', () => {
    expect(xmlEscape(`hello 'world' "42"`)).toBe(`hello 'world' "42"`);
  });
});

describe('isNumeric', () => {
  test.each([
    [3, true],
    ['3', true],
    ['3.14', true],
    ['-2', true],
    ['', false],
    ['   ', false],
    ['3 points', false],
    ['<script>', false],
    [null, false],
    [undefined, false],
    [Number.NaN, false],
    [Number.POSITIVE_INFINITY, false],
  ])('isNumeric(%p) === %p', (input, expected) => {
    expect(isNumeric(input)).toBe(expected);
  });
});

describe('rowsToXLS', () => {
  test('empty rows produces a valid workbook shell', () => {
    const out = rowsToXLS([]);
    expect(out).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(out).toContain('<Workbook');
    expect(out).toContain('<Styles>');
    expect(out).toContain('<Worksheet ss:Name="Bewertung">');
    expect(out).toContain('<Table>');
    expect(out).toContain('</Table>');
    expect(out).toContain('</Workbook>');
  });

  test('declares all nine column widths in order', () => {
    const out = rowsToXLS([]);
    const matches = [...out.matchAll(/<Column ss:Width="(\d+)"\/>/g)].map((m) => Number(m[1]));
    expect(matches).toEqual([180, 200, 250, 250, 150, 150, 150, 60, 250]);
  });

  test('title row: first cell styled, others unstyled', () => {
    const row: Row = { kind: ROW_KIND.TITLE, cells: ['PkOrg Bewertung Export'] };
    const out = rowsToXLS([row]);
    expect(out).toContain('<Cell ss:StyleID="title"><Data ss:Type="String">PkOrg Bewertung Export');
  });

  test('header row uses row-level header style', () => {
    const row: Row = { kind: ROW_KIND.HEADER, cells: ['A', 'B', 'C'] };
    const out = rowsToXLS([row]);
    expect(out).toContain('<Row ss:StyleID="header">');
  });

  test('data row: score column styled "score", others "normal"', () => {
    const row: Row = {
      kind: ROW_KIND.DATA,
      cells: ['Sec', 'Crit', 'Desc', 'Q3', 'Q2', 'Q1', 'Q0', 3, 'Comment'],
    };
    const out = rowsToXLS([row]);
    expect(out).toContain('<Cell ss:StyleID="score"><Data ss:Type="Number">3</Data></Cell>');
    // Section cell (index 0) should be "normal"
    expect(out).toContain('<Cell ss:StyleID="normal"><Data ss:Type="String">Sec</Data></Cell>');
    // Comment cell (index 8) should be "normal"
    expect(out).toContain('<Cell ss:StyleID="normal"><Data ss:Type="String">Comment</Data></Cell>');
  });

  test('spacer row emits an empty <Row>', () => {
    const row: Row = { kind: ROW_KIND.SPACER, cells: [] };
    const out = rowsToXLS([row]);
    expect(out).toContain('<Row></Row>');
  });

  test('meta row has no row- or cell-level style', () => {
    const row: Row = { kind: ROW_KIND.META, cells: ['Candidate:', 'Alice'] };
    const out = rowsToXLS([row]);
    expect(out).toContain('<Row><Cell><Data ss:Type="String">Candidate:');
    expect(out).toContain('<Cell><Data ss:Type="String">Alice');
  });

  test('title row respects its own cell count (not padded to 9)', () => {
    const row: Row = { kind: ROW_KIND.TITLE, cells: ['Only one cell'] };
    const out = rowsToXLS([row]);
    const titleRowMatch = out.match(/<Row>(?:<Cell[^>]*><Data[^>]*>[^<]*<\/Data><\/Cell>)+<\/Row>/);
    expect(titleRowMatch).not.toBeNull();
    const cellCount = (titleRowMatch?.[0].match(/<Cell/g) ?? []).length;
    expect(cellCount).toBe(1);
  });

  test('numeric detection on data cells — string "3" becomes Number, "" stays String, "   " stays String', () => {
    const rows: Row[] = [
      { kind: ROW_KIND.DATA, cells: ['s', 'c', 'd', '', '', '', '', '3', 'ok'] },
      { kind: ROW_KIND.DATA, cells: ['s', 'c', 'd', '', '', '', '', '', 'ok'] },
      { kind: ROW_KIND.DATA, cells: ['s', 'c', 'd', '', '', '', '', '   ', 'ok'] },
    ];
    const out = rowsToXLS(rows);
    expect(out).toContain('<Cell ss:StyleID="score"><Data ss:Type="Number">3</Data></Cell>');
    expect(out).toContain('<Cell ss:StyleID="score"><Data ss:Type="String"></Data></Cell>');
    expect(out).toContain('<Cell ss:StyleID="score"><Data ss:Type="String">   </Data></Cell>');
  });

  test('escapes angle brackets and ampersands in cell content', () => {
    const row: Row = { kind: ROW_KIND.META, cells: ['<tag>', 'a & b'] };
    const out = rowsToXLS([row]);
    expect(out).toContain('&lt;tag&gt;');
    expect(out).toContain('a &amp; b');
  });

  test('full fixture snapshot', () => {
    const rows: Row[] = [
      { kind: ROW_KIND.TITLE, cells: ['PkOrg Bewertung Export'] },
      { kind: ROW_KIND.META, cells: ['Candidate:', 'Alice'] },
      { kind: ROW_KIND.META, cells: ['Exported:', '01.01.2026, 12:00:00'] },
      { kind: ROW_KIND.SPACER, cells: [] },
      {
        kind: ROW_KIND.HEADER,
        cells: [
          'Section',
          'Criterion',
          'Description',
          'QL3',
          'QL2',
          'QL1',
          'QL0',
          'Pts',
          'Comment',
        ],
      },
      {
        kind: ROW_KIND.DATA,
        cells: ['Sec', 'Crit', 'Desc', 'Q3', 'Q2', 'Q1', 'Q0', 3, 'Great'],
      },
    ];
    expect(rowsToXLS(rows)).toMatchSnapshot();
  });
});
