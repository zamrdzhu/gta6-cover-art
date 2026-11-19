// main.ts — the hand-in program for Vice Cover Studio (Node 22, standard
// library only). It gathers the entry — the app/ folder and the screenshots/
// folder beside this file — into the output directory and writes
// /output/dossier.json with the kit's vendored buildDossier, so the judge
// reads exactly what the app ships. Outside the grader, MAKEFUN_OUTPUT_DIR
// stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program is deliberately deterministic: it copies files in the same
// order and writes the same dossier bytes on every run, so two runs produce
// byte-identical output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps mirror the gate's own limits: at most 4 screenshots, each at
// most 256 KiB; app/ at most 993 entries and 48 MiB in all, with no path
// over 1000 bytes; the dossier's source text capped at 160 KiB. The
// screenshots/ copy keeps the entry's four JPEGs exactly as committed.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
