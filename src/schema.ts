import { HEADER_LABELS, ROW_KIND } from './styles.ts';
import type { BewertungSchema, CriterionValue, Row, SchemaNode, ScoreMap } from './types.ts';

interface BuildOptions {
  now?: () => Date;
}

function sortEntries<T>(obj: Record<string, T>): Array<[string, T]> {
  return Object.entries(obj).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
}

function isLeaf(node: SchemaNode): boolean {
  return Array.isArray(node.children) && node.children.length === 0;
}

function isCriterion(value: SchemaNode['value']): value is CriterionValue {
  return value !== undefined && 'key' in value && typeof value.key === 'string';
}

function qualityDescription(
  values: ReadonlyArray<{ value: number; description?: string }> | undefined,
  target: number,
): string {
  return values?.find((v) => v.value === target)?.description ?? '';
}

export function buildExcelRows(
  candidateName: string,
  schema: BewertungSchema,
  domData: ScoreMap,
  { now = () => new Date() }: BuildOptions = {},
): Row[] {
  const rows: Row[] = [
    { kind: ROW_KIND.TITLE, cells: ['PkOrg Bewertung Export'] },
    { kind: ROW_KIND.META, cells: ['Candidate:', candidateName] },
    { kind: ROW_KIND.META, cells: ['Exported:', now().toLocaleString('de-CH')] },
    { kind: ROW_KIND.SPACER, cells: [] },
    { kind: ROW_KIND.HEADER, cells: [...HEADER_LABELS] },
  ];

  for (const [, section] of sortEntries(schema.children)) {
    const sectionName = section.value?.name ?? '';
    const childrenMap =
      section.children && !Array.isArray(section.children) ? section.children : {};

    for (const [, criterion] of sortEntries(childrenMap)) {
      if (!isLeaf(criterion)) continue;
      const cv = criterion.value;
      if (!isCriterion(cv)) continue;

      const values = cv.config?.values;
      const dom = domData[cv.key];
      const score = dom?.score ?? '';
      const comment = dom?.comment ?? '';

      rows.push({
        kind: ROW_KIND.DATA,
        cells: [
          sectionName,
          cv.name,
          cv.data ?? '',
          qualityDescription(values, 3),
          qualityDescription(values, 2),
          qualityDescription(values, 1),
          qualityDescription(values, 0),
          score,
          comment,
        ],
      });
    }
  }

  return rows;
}
