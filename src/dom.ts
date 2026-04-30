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
    const tds = directChildren(tr, 'TD');
    const tdLabel = tds[0];
    if (!tdLabel) continue;

    const radios = tr.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    let score: number | null;
    let radioKey = '';
    if (radios.length > 0) {
      const checked = Array.from(radios).find((r) => r.checked);
      score = checked ? Number(checked.value) : null;
      radioKey = (radios[0]?.name ?? '').replace(/^grading-/, '').replace(/-$/, '');
    } else {
      score = extractReadonlyScore(tds);
    }

    const nameSpan = directChildren(tdLabel, 'SPAN').find((el) =>
      el.classList.contains('nl2br'),
    );
    const criterionName = nameSpan?.textContent?.trim() ?? '';

    const comment = extractComments(tdLabel);

    const entry = { score, comment };
    if (radioKey) result[radioKey] = entry;
    if (criterionName) result[criterionName] = entry;
  }

  return result;
}

function directChildren(el: Element, tagName: string): HTMLElement[] {
  return Array.from(el.children).filter(
    (c): c is HTMLElement => c.tagName === tagName,
  );
}

function extractReadonlyScore(tds: HTMLElement[]): number | null {
  for (const td of tds) {
    const span = td.querySelector<HTMLElement>('span');
    if (!span) continue;
    const hasScoringMarker =
      span.querySelector('.max-points') !== null ||
      span.querySelector('.diff-value-text') !== null;
    if (!hasScoringMarker) continue;
    let directText = '';
    for (const node of Array.from(span.childNodes)) {
      if (node.nodeType === 3) directText += node.textContent ?? '';
    }
    const num = Number(directText.trim().replace(',', '.'));
    if (Number.isFinite(num)) return num;
  }
  return null;
}

function extractComments(tdLabel: Element): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  const paragraphs = directChildren(tdLabel, 'P').filter((p) =>
    p.classList.contains('comment'),
  );
  if (paragraphs.length > 0) {
    for (const p of paragraphs) {
      const role = p.querySelector('strong')?.textContent?.replace(/:\s*$/, '').trim() ?? 'Comment';
      const bodySpan =
        p.querySelector<HTMLElement>('.comment-body span[ng-bind-html]') ??
        p.querySelector<HTMLElement>('.comment-body');
      const text = (bodySpan?.innerText ?? bodySpan?.textContent ?? '').trim();
      if (!text) continue;
      const key = `${role}::${text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      parts.push(`${role}: ${text}`);
    }
    return parts.join('\n\n');
  }
  const bare = tdLabel.querySelector<HTMLElement>('span.comment-body');
  return (bare?.innerText ?? bare?.textContent ?? '').trim();
}

export function getBewertungApiUrl(perf: Performance = performance): string | null {
  const entries = perf.getEntriesByType('resource');
  const match = entries
    .map((e) => e.name)
    .filter((url) => url.includes(BEWERTUNG_URL_FRAGMENT))
    .pop();
  return match ?? null;
}
