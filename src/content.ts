import { EXPORT_BUTTON_ID, injectExportButton } from './dom.ts';
import { exportBewertung } from './export.ts';

const observer = new MutationObserver(() => {
  const dialog = document.querySelector('[role="alertdialog"]');
  if (dialog && !document.getElementById(EXPORT_BUTTON_ID)) {
    injectExportButton(dialog, () => {
      void exportBewertung(dialog);
    });
  }
});

observer.observe(document.body, { childList: true, subtree: true });
