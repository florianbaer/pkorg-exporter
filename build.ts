import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const TARGETS = ['chrome', 'firefox'] as const;
type Target = (typeof TARGETS)[number];

const baseManifest = JSON.parse(readFileSync('./manifest.json', 'utf8'));

function manifestFor(target: Target): unknown {
  if (target === 'firefox') {
    return {
      ...baseManifest,
      browser_specific_settings: {
        gecko: {
          id: 'pkorg-exporter@local',
          strict_min_version: '128.0',
        },
      },
    };
  }
  return baseManifest;
}

rmSync('./dist', { recursive: true, force: true });
mkdirSync('./dist', { recursive: true });

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
// top-level import/export statements may survive bundling.
const bundle = readFileSync('./dist/content.js', 'utf8');
if (/^(import|export)\s/m.test(bundle)) {
  console.error('bundle leaked top-level import/export — entry file must not re-export');
  process.exit(1);
}

for (const target of TARGETS) {
  const dir = `./dist/${target}`;
  mkdirSync(dir, { recursive: true });
  copyFileSync('./dist/content.js', `${dir}/content.js`);
  writeFileSync(
    `${dir}/manifest.json`,
    `${JSON.stringify(manifestFor(target), null, 2)}\n`,
  );
  console.log(`built dist/${target}/ (${bundle.length} bytes)`);
}
