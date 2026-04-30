import { describe, expect, test } from 'bun:test';
import { buildExcelRows } from './schema.ts';
import { ROW_KIND } from './styles.ts';
import type { BewertungSchema, ScoreMap } from './types.ts';

function makeCriterion(
  key: string,
  name: string,
  description = '',
  values = defaultQualityValues(),
) {
  return {
    value: { key, name, data: description, config: { values } },
    children: [],
  };
}

function defaultQualityValues() {
  return [
    { value: 3, description: 'Excellent' },
    { value: 2, description: 'Good' },
    { value: 1, description: 'Fair' },
    { value: 0, description: 'Poor' },
  ];
}

describe('buildExcelRows', () => {
  test('emits header rows in correct order (TITLE, META, META, SPACER, HEADER, DATA...)', () => {
    const schema: BewertungSchema = {
      children: {
        '1_Ausf': {
          value: { name: 'Execution' },
          children: { '01': makeCriterion('K/1_Ausf/01', 'Crit A') },
        },
      },
    };
    const rows = buildExcelRows(
      'Alice',
      schema,
      {},
      { now: () => new Date('2026-01-01T12:00:00Z') },
    );
    expect(rows.map((r) => r.kind)).toEqual([
      ROW_KIND.TITLE,
      ROW_KIND.META,
      ROW_KIND.META,
      ROW_KIND.SPACER,
      ROW_KIND.HEADER,
      ROW_KIND.DATA,
    ]);
  });

  test('candidate name appears in first meta row', () => {
    const schema: BewertungSchema = { children: {} };
    const rows = buildExcelRows('Bob', schema, {});
    const metaRow = rows[1];
    expect(metaRow?.cells).toEqual(['Candidate:', 'Bob']);
  });

  test('now parameter controls the Exported timestamp', () => {
    const schema: BewertungSchema = { children: {} };
    const fixed = new Date('2026-04-01T08:30:00');
    const rows = buildExcelRows('Alice', schema, {}, { now: () => fixed });
    const exportedRow = rows[2];
    expect(exportedRow?.cells[0]).toBe('Exported:');
    expect(exportedRow?.cells[1]).toBe(fixed.toLocaleString('de-CH'));
  });

  test('sections are sorted numerically, not lexicographically', () => {
    const schema: BewertungSchema = {
      children: {
        '10_Foo': {
          value: { name: 'Ten' },
          children: { '01': makeCriterion('K/10_Foo/01', 'Ten-A') },
        },
        '2_Doc': {
          value: { name: 'Two' },
          children: { '01': makeCriterion('K/2_Doc/01', 'Two-A') },
        },
        '1_Ausf': {
          value: { name: 'One' },
          children: { '01': makeCriterion('K/1_Ausf/01', 'One-A') },
        },
      },
    };
    const rows = buildExcelRows('Alice', schema, {});
    const dataRows = rows.filter((r) => r.kind === ROW_KIND.DATA);
    const sections = dataRows.map((r) => r.cells[0]);
    expect(sections).toEqual(['One', 'Two', 'Ten']);
  });

  test('quality level mapping is by value, not array order', () => {
    const shuffled = [
      { value: 0, description: 'Poor' },
      { value: 2, description: 'Good' },
      { value: 3, description: 'Excellent' },
      { value: 1, description: 'Fair' },
    ];
    const schema: BewertungSchema = {
      children: {
        '1_Ausf': {
          value: { name: 'Execution' },
          children: { '01': makeCriterion('K/1_Ausf/01', 'Crit A', 'desc', shuffled) },
        },
      },
    };
    const rows = buildExcelRows('Alice', schema, {});
    const dataRow = rows.find((r) => r.kind === ROW_KIND.DATA);
    expect(dataRow?.cells.slice(3, 7)).toEqual(['Excellent', 'Good', 'Fair', 'Poor']);
  });

  test('missing DOM score and comment become empty strings', () => {
    const schema: BewertungSchema = {
      children: {
        '1_Ausf': {
          value: { name: 'Execution' },
          children: { '01': makeCriterion('K/1_Ausf/01', 'Crit A') },
        },
      },
    };
    const rows = buildExcelRows('Alice', schema, {});
    const dataRow = rows.find((r) => r.kind === ROW_KIND.DATA);
    expect(dataRow?.cells[7]).toBe('');
    expect(dataRow?.cells[8]).toBe('');
  });

  test('DOM score is threaded through to the data row', () => {
    const schema: BewertungSchema = {
      children: {
        '1_Ausf': {
          value: { name: 'Execution' },
          children: { '01': makeCriterion('K/1_Ausf/01', 'Crit A') },
        },
      },
    };
    const dom: ScoreMap = {
      'K/1_Ausf/01': { score: 2, comment: 'solid work' },
    };
    const rows = buildExcelRows('Alice', schema, dom);
    const dataRow = rows.find((r) => r.kind === ROW_KIND.DATA);
    expect(dataRow?.cells[7]).toBe(2);
    expect(dataRow?.cells[8]).toBe('solid work');
  });

  test('falls back to criterion name when key is missing from DOM data', () => {
    const schema: BewertungSchema = {
      children: {
        '1_Ausf': {
          value: { name: 'Execution' },
          children: { '01': makeCriterion('K/1_Ausf/01', 'A01: Job analysis') },
        },
      },
    };
    const dom: ScoreMap = {
      'A01: Job analysis': { score: 2, comment: 'readonly fixture' },
    };
    const rows = buildExcelRows('Alice', schema, dom);
    const dataRow = rows.find((r) => r.kind === ROW_KIND.DATA);
    expect(dataRow?.cells[7]).toBe(2);
    expect(dataRow?.cells[8]).toBe('readonly fixture');
  });

  test('non-leaf criteria are skipped', () => {
    const schema: BewertungSchema = {
      children: {
        '1_Ausf': {
          value: { name: 'Execution' },
          children: {
            // non-leaf: children is a non-empty record
            '01': {
              value: { key: 'K/1_Ausf/01', name: 'Parent' },
              children: { sub: makeCriterion('K/1_Ausf/01/sub', 'Sub') },
            },
            '02': makeCriterion('K/1_Ausf/02', 'Real leaf'),
          },
        },
      },
    };
    const rows = buildExcelRows('Alice', schema, {});
    const dataRows = rows.filter((r) => r.kind === ROW_KIND.DATA);
    expect(dataRows).toHaveLength(1);
    expect(dataRows[0]?.cells[1]).toBe('Real leaf');
  });
});
