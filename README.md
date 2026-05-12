# PkOrg Kriterien-Export

Ein kleines Browser-Plugin für Chromium und Firefox, das PkOrg das beibringt, was eigentlich von Anfang an drin sein sollte: einen anständigen Excel-Export der **Bewertungskriterien**.

## Was macht das Ding?

Wenn du auf [2026.pkorg.ch](https://2026.pkorg.ch) einen Bewertungsdialog öffnest, taucht ein zusätzlicher Button auf. Ein Klick – und der komplette Kriterienkatalog (Sections, Kriterien, Beschreibungen, Quality Levels 0–3) landet als Excel-Datei auf deiner Festplatte. Kein Copy-Paste, kein Screenshot, kein abendliches Abtippen mehr.

Damit lässt sich offline lesen, vergleichen, vorbereiten – statt sich durch ein Web-UI zu klicken, das offenbar mit „Export" noch nie warm geworden ist.

Bonus: Falls PkOrg beim nächsten „Speichern" wieder mal die Eingaben aller anderen Experten grosszügig mit den eigenen überschreibt – kein totaler Datenverlust mehr. Die letzte Version liegt sicher als `.xls` auf der Platte. Versionskontrolle als Browser-Plugin, weil es im Backend offenbar keine gibt.

## Installation

Build:

```bash
bun install
bun run build
```

Das erzeugt `dist/chrome/` und `dist/firefox/`. Fertige Builds gibt es auch als CI-Artefakte unter Actions → ci.

### Chromium (Chrome, Edge, Brave, …)

1. `chrome://extensions` öffnen
2. Entwicklermodus einschalten
3. „Entpackte Erweiterung laden" → den `dist/chrome/`-Ordner auswählen

### Firefox

1. `about:debugging#/runtime/this-firefox` öffnen
2. „Temporäres Add-on laden…" → die `manifest.json` aus `dist/firefox/` auswählen

## Entwicklung

```bash
bun install
bun test
bun run build
```

## Warum?

Weil Excel-Export im Jahr 2026 eigentlich kein optionales Feature mehr sein sollte.
