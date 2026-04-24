import { EXPORT_BUTTON_ID, getBewertungApiUrl, readDomScoresAndComments } from './dom.ts';
import { buildExcelRows } from './schema.ts';
import type { BewertungSchema, ExportDeps } from './types.ts';
import { downloadXLS } from './xls.ts';

interface BewertungResponse {
  bewertung: {
    schemaId: string;
    schemata: Record<string, BewertungSchema>;
  };
}

export async function exportBewertung(dialog: Element, deps: ExportDeps = {}): Promise<void> {
  const {
    fetch: fetchFn = fetch,
    getApiUrl = getBewertungApiUrl,
    readDom = readDomScoresAndComments,
    buildRows = buildExcelRows,
    download = downloadXLS,
  } = deps;

  const btn = dialog.ownerDocument?.getElementById(EXPORT_BUTTON_ID) as HTMLButtonElement | null;
  const originalLabel = btn?.textContent ?? '';
  if (btn) {
    btn.textContent = '⏳ Loading...';
    btn.disabled = true;
  }

  try {
    const candidateName =
      dialog.querySelector<HTMLElement>('.kandidat')?.innerText?.trim() || 'Unknown';

    const apiUrl = getApiUrl();
    if (!apiUrl) {
      alert('Could not find Bewertung API URL. Please close and reopen the dialog.');
      return;
    }

    const response = await fetchFn(apiUrl);
    const data = (await response.json()) as BewertungResponse;
    const schema = data.bewertung.schemata[data.bewertung.schemaId];
    if (!schema) {
      alert(`Bewertung schema "${data.bewertung.schemaId}" not found in response.`);
      return;
    }

    const domData = readDom(dialog);
    const rows = buildRows(candidateName, schema, domData);
    download(rows, candidateName);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    alert(`Export failed: ${msg}`);
    console.error(e);
  } finally {
    if (btn) {
      btn.textContent = originalLabel || '📊 Export to Excel';
      btn.disabled = false;
    }
  }
}
