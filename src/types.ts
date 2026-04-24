export type RowKind = 'title' | 'meta' | 'spacer' | 'header' | 'data';

export type CellValue = string | number;

export interface Row {
  kind: RowKind;
  cells: ReadonlyArray<CellValue>;
}

export interface QualityValue {
  value: number;
  title?: string;
  description?: string;
}

export interface CriterionValue {
  key: string;
  name: string;
  data?: string;
  config?: { values?: QualityValue[] };
}

export interface SectionValue {
  name?: string;
}

export interface SchemaNode {
  value?: CriterionValue | SectionValue;
  children: SchemaNode[] | Record<string, SchemaNode>;
}

export interface BewertungSchema {
  children: Record<string, SchemaNode>;
}

export interface DomScore {
  score: number | null;
  comment: string;
}

export type ScoreMap = Record<string, DomScore>;

export interface ExportDeps {
  fetch?: typeof fetch;
  getApiUrl?: () => string | null;
  readDom?: (dialog: Element) => ScoreMap;
  buildRows?: (name: string, schema: BewertungSchema, dom: ScoreMap) => Row[];
  download?: (rows: Row[], name: string) => void;
  now?: () => Date;
}
