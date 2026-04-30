import { describe, expect, spyOn, test } from 'bun:test';
import {
  EXPORT_BUTTON_ID,
  getBewertungApiUrl,
  injectExportButton,
  readDomScoresAndComments,
} from './dom.ts';

function makeDialog(inner: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.setAttribute('role', 'alertdialog');
  wrapper.innerHTML = inner;
  document.body.appendChild(wrapper);
  return wrapper;
}

function cleanup() {
  document.body.innerHTML = '';
}

describe('readDomScoresAndComments', () => {
  test('parses score and comment from level-1 rows', () => {
    cleanup();
    const dialog = makeDialog(`
      <table>
        <tr class="level-1">
          <td><span class="comment-body">  hello world  </span></td>
          <td></td>
          <td>
            <input type="radio" name="grading-K/1_Ausf/01-" value="0" />
            <input type="radio" name="grading-K/1_Ausf/01-" value="1" />
            <input type="radio" name="grading-K/1_Ausf/01-" value="2" checked />
            <input type="radio" name="grading-K/1_Ausf/01-" value="3" />
          </td>
        </tr>
        <tr class="level-1">
          <td><span class="comment-body"></span></td>
          <td></td>
          <td>
            <input type="radio" name="grading-K/1_Ausf/02-" value="0" />
            <input type="radio" name="grading-K/1_Ausf/02-" value="1" />
          </td>
        </tr>
      </table>
    `);

    const result = readDomScoresAndComments(dialog);
    expect(result['K/1_Ausf/01']).toEqual({ score: 2, comment: 'hello world' });
    expect(result['K/1_Ausf/02']).toEqual({ score: null, comment: '' });
  });

  test('skips rows with fewer than 3 cells', () => {
    cleanup();
    const dialog = makeDialog(`
      <table>
        <tr class="level-1"><td></td><td></td></tr>
      </table>
    `);
    expect(readDomScoresAndComments(dialog)).toEqual({});
  });

  test('skips rows with no radio (empty key)', () => {
    cleanup();
    const dialog = makeDialog(`
      <table>
        <tr class="level-1"><td></td><td></td><td></td></tr>
      </table>
    `);
    expect(readDomScoresAndComments(dialog)).toEqual({});
  });

  test('readonly mode: extracts score from text span and indexes by criterion name', () => {
    cleanup();
    const dialog = makeDialog(`
      <table>
        <tr class="level-1">
          <td>
            <span class="nl2br">A01: Job analysis</span>
            <p class="description">How is the order analysed?</p>
            <p class="comment"><strong>Comment Responsible specialist:</strong><br>
              <span class="comment-body"><span ng-bind-html="processed">RS feedback</span></span>
            </p>
            <p class="comment"><strong>Comment Expert:</strong><br>
              <span class="comment-body"><span ng-bind-html="processed">MEX: expert feedback</span></span>
            </p>
          </td>
          <td><span>1 ×</span></td>
          <td>
            <span>2,0
              <span class="max-points">/ 3</span>
              <span class="diff-value-text">3,0</span>
            </span>
          </td>
          <td><span>2,0</span></td>
          <td>&nbsp;</td>
        </tr>
      </table>
    `);

    const result = readDomScoresAndComments(dialog);
    const entry = result['A01: Job analysis'];
    expect(entry?.score).toBe(2);
    expect(entry?.comment).toContain('Comment Responsible specialist: RS feedback');
    expect(entry?.comment).toContain('Comment Expert: MEX: expert feedback');
  });

  test('readonly mode: handles row with no diff-value-text', () => {
    cleanup();
    const dialog = makeDialog(`
      <table>
        <tr class="level-1">
          <td><span class="nl2br">A02: Information research</span></td>
          <td><span>1 ×</span></td>
          <td>
            <span>3,0
              <span class="max-points">/ 3</span>
            </span>
          </td>
        </tr>
      </table>
    `);
    expect(readDomScoresAndComments(dialog)['A02: Information research']?.score).toBe(3);
  });
});

describe('injectExportButton', () => {
  test('appends button to .modal-header when present', () => {
    cleanup();
    const dialog = makeDialog('<div class="modal-header"></div>');
    const btn = injectExportButton(dialog, () => {});
    expect(btn).not.toBeNull();
    const header = dialog.querySelector('.modal-header');
    expect(header?.querySelector(`#${EXPORT_BUTTON_ID}`)).toBe(btn);
  });

  test('falls back to .ngdialog-content prepend when no modal-header', () => {
    cleanup();
    const dialog = makeDialog('<div class="ngdialog-content"><span>existing</span></div>');
    injectExportButton(dialog, () => {});
    const content = dialog.querySelector('.ngdialog-content');
    expect(content?.firstElementChild?.id).toBe(EXPORT_BUTTON_ID);
  });

  test('falls back to dialog prepend when neither container exists', () => {
    cleanup();
    const dialog = makeDialog('<p>nothing else</p>');
    injectExportButton(dialog, () => {});
    expect(dialog.firstElementChild?.id).toBe(EXPORT_BUTTON_ID);
  });

  test('does not inject twice', () => {
    cleanup();
    const dialog = makeDialog('<div class="modal-header"></div>');
    injectExportButton(dialog, () => {});
    const second = injectExportButton(dialog, () => {});
    expect(second).toBeNull();
    expect(document.querySelectorAll(`#${EXPORT_BUTTON_ID}`).length).toBe(1);
  });

  test('click handler fires', () => {
    cleanup();
    const dialog = makeDialog('<div class="modal-header"></div>');
    let clicked = 0;
    const btn = injectExportButton(dialog, () => {
      clicked += 1;
    });
    btn?.click();
    expect(clicked).toBe(1);
  });
});

describe('getBewertungApiUrl', () => {
  test('returns the most recent matching resource entry', () => {
    const entries = [
      { name: 'https://2026.pkorg.ch/api/something-else' },
      { name: 'https://2026.pkorg.ch/api/prozessschritt/bewertung/data?id=1' },
      { name: 'https://2026.pkorg.ch/api/prozessschritt/bewertung/data?id=2' },
    ] as PerformanceEntry[];
    const perf = {
      getEntriesByType: () => entries,
    } as unknown as Performance;
    expect(getBewertungApiUrl(perf)).toBe(
      'https://2026.pkorg.ch/api/prozessschritt/bewertung/data?id=2',
    );
  });

  test('returns null when no match', () => {
    const perf = { getEntriesByType: () => [] } as unknown as Performance;
    expect(getBewertungApiUrl(perf)).toBeNull();
  });

  test('uses global performance by default (spied)', () => {
    const spy = spyOn(performance, 'getEntriesByType').mockReturnValue([
      { name: 'https://x/prozessschritt/bewertung/data' } as PerformanceEntry,
    ]);
    try {
      expect(getBewertungApiUrl()).toBe('https://x/prozessschritt/bewertung/data');
    } finally {
      spy.mockRestore();
    }
  });
});
