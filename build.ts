import { copyFileSync, readFileSync } from 'node:fs';

const result = await Bun.build({
  entrypoints: ['./src/content.ts'],
  outdir: './dist',
  target: 'browser',
  format: 'esm',
  naming: 'content.js',
  sourcemap: 'inline',
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

// Invariant: the bundle must load as a classic MV3 content script, so no
// top-level import/export statements may survive bundling. Since the entry
// has no `export`s and Bun inlines all internal imports, this should always
// hold — the check catches regressions if someone later adds a top-level export.
const out = readFileSync('./dist/content.js', 'utf8');
if (/^(import|export)\s/m.test(out)) {
  console.error('bundle leaked top-level import/export — entry file must not re-export');
  process.exit(1);
}

copyFileSync('./manifest.json', './dist/manifest.json');

console.log(`built dist/content.js (${out.length} bytes)`);

