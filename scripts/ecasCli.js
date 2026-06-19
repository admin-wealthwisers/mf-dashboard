#!/usr/bin/env node
/**
 * eCAS CLI for PIOS — parses a CAMS/KFintech Consolidated Account Statement PDF
 * and prints {investor, holdings, summary} as JSON to stdout. Reuses the same
 * parser the web app uses. Invoked by PIOS via subprocess.
 *
 *   node scripts/ecasCli.js /path/to/cas.pdf
 */
import { readFileSync } from 'fs';
import { parseECAS } from '../server/utils/ecasParser.js';

const path = process.argv[2];
const withText = process.argv.includes('--text');
if (!path) {
  console.error('usage: ecasCli.js <pdf-path> [--text]');
  process.exit(2);
}
try {
  const buf = readFileSync(path);
  const result = await parseECAS(buf);
  if (withText) {
    // additive: include raw PDF text so PIOS can reconstruct the full
    // transaction timeline (equity curve / XIRR) without touching the
    // live mfanalytics.in holdings parser above.
    const pdf = (await import('pdf-parse')).default;
    result.rawText = (await pdf(buf)).text;
  }
  process.stdout.write(JSON.stringify(result));
} catch (e) {
  console.error('ECAS_PARSE_ERROR: ' + (e && e.message ? e.message : String(e)));
  process.exit(1);
}
