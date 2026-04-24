import { BUTTON_CSS } from './styles.ts';
import type { ScoreMap } from './types.ts';

export const EXPORT_BUTTON_ID = 'pkorg-export-btn';
const BEWERTUNG_URL_FRAGMENT = '/prozessschritt/bewertung/data';

export function injectExportButton(dialog: Element, onClick: () => void): HTMLButtonElement | null {
  if (dialog.ownerDocument?.getElementById(EXPORT_BUTTON_ID)) return null;

  const btn = document.createElement('button');
  btn.id = EXPORT_BUTTON_ID;
  btn.textContent = '📊 Export to Excel';
  btn.type = 'button';
  btn.style.cssText = BUTTON_CSS;
  btn.onclick = onClick;

  const header = dialog.querySelector('.modal-header');
  if (header) {
    header.appendChild(btn);
    return btn;
  }

  const content = dialog.querySelector('.ngdialog-content');
  if (content) {
    content.prepend(btn);
    return btn;
  }

  dialog.prepend(btn);
  return btn;
}

export function readDomScoresAndComments(dialog: Element): ScoreMap {
  const result: ScoreMap = {};

  for (const tr of dialog.querySelectorAll('tr.level-1')) {
    const tds = tr.querySelectorAll('td');
    if (tds.length < 3) continue;

    const tdScores = tds[2];
    const tdLabel = tds[0];
    if (!tdScores || !tdLabel) continue;

    const radios = tdScores.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    const checked = Array.from(radios).find((r) => r.checked);
    const score = checked ? Number(checked.value) : null;

    const radioName = radios[0]?.name ?? '';
    const key = radioName.replace(/^grading-/, '').replace(/-$/, '');

    const commentEl = tdLabel.querySelector<HTMLElement>('span.comment-body');
    const comment = commentEl?.innerText?.trim() ?? '';

    if (key) {
      result[key] = { score, comment };
    }
  }

  return result;
}

export function getBewertungApiUrl(perf: Performance = performance): string | null {
  const entries = perf.getEntriesByType('resource');
  const match = entries
    .map((e) => e.name)
    .filter((url) => url.includes(BEWERTUNG_URL_FRAGMENT))
    .pop();
  return match ?? null;
}
