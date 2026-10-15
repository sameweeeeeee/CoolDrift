// export-strings.mjs — copies the app text from the Expo app to the iOS app.
//
// The main copy of every translation is apps/expo/src/i18n/<language>.ts.
// The iOS app reads the same text from apps/ios/CoolDrift/Resources/Strings/<language>.json,
// as flat keys like "risk.low". Run this after changing any translation:
//
//   node tools/export-strings.mjs
//
// (Needs Node 22.6 or newer, which can read .ts files directly.)

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'apps/expo/src/i18n');
const outDir = path.join(root, 'apps/ios/CoolDrift/Resources/Strings');

/** { risk: { low: 'LOW' } } → { 'risk.low': 'LOW' } (lists like tips stay lists). */
const flatten = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
};

for (const lang of ['en', 'zh', 'ms', 'ta']) {
  const mod = await import(path.join(srcDir, `${lang}.ts`));
  const flat = flatten(mod.default);
  writeFileSync(path.join(outDir, `${lang}.json`), JSON.stringify(flat, null, 2) + '\n');
  console.log(`${lang}: ${Object.keys(flat).length} lines`);
}
