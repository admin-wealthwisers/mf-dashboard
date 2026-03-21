/**
 * Import portfolio holdings from CSV files.
 *
 * Usage:
 *   node scripts/importHoldings.js <csv_path> [--dry-run]
 *   node scripts/importHoldings.js data/holdings/  [--dry-run]   (imports all CSVs in directory)
 *
 * CSV format: scheme_code,instrument,isin,weight,report_date
 *   - weight as decimal (0.08 = 8%)
 *   - report_date as YYYY-MM-DD
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, extname, basename } from 'path';
import db from '../server/db.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const paths = args.filter((a) => a !== '--dry-run');

if (paths.length === 0) {
  console.log('Usage: node scripts/importHoldings.js <csv_path_or_dir> [--dry-run]');
  process.exit(1);
}

// Resolve files
const csvFiles = [];
for (const p of paths) {
  const resolved = resolve(p);
  const stat = statSync(resolved);
  if (stat.isDirectory()) {
    const files = readdirSync(resolved)
      .filter((f) => extname(f) === '.csv')
      .map((f) => resolve(resolved, f));
    csvFiles.push(...files);
  } else {
    csvFiles.push(resolved);
  }
}

if (csvFiles.length === 0) {
  console.log('No CSV files found.');
  process.exit(1);
}

console.log(`${dryRun ? '[DRY RUN] ' : ''}Processing ${csvFiles.length} CSV file(s)...\n`);

// Prepared statements
const findInstrument = db.prepare('SELECT instrument_id FROM instruments WHERE isin = ?');
const insertInstrument = db.prepare(
  `INSERT INTO instruments (name, isin, asset_class, sector, country) VALUES (?, ?, 'Equity', 'Other', 'India')`
);
const insertHolding = db.prepare(
  `INSERT OR REPLACE INTO portfolio_holdings (scheme_code, instrument_id, weight, report_date) VALUES (?, ?, ?, ?)`
);

let totalInserted = 0;
let totalInstrumentsCreated = 0;

for (const file of csvFiles) {
  const content = readFileSync(file, 'utf-8');
  const lines = content.trim().split('\n');

  // Skip header
  const header = lines[0].toLowerCase();
  const hasHeader = header.includes('scheme_code') || header.includes('isin');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  let fileInserted = 0;
  let fileInstrumentsCreated = 0;
  const schemeCodes = new Set();

  const importFile = db.transaction(() => {
    for (const line of dataLines) {
      const parts = line.split(',').map((s) => s.trim());
      if (parts.length < 5) continue;

      const [schemeCode, instrumentName, isin, weightStr, reportDate] = parts;
      const weight = parseFloat(weightStr);
      if (isNaN(weight) || !schemeCode || !isin) continue;

      schemeCodes.add(schemeCode);

      // Find or create instrument
      let row = findInstrument.get(isin);
      if (!row) {
        if (!dryRun) {
          const result = insertInstrument.run(instrumentName, isin);
          row = { instrument_id: result.lastInsertRowid };
        } else {
          row = { instrument_id: '(new)' };
        }
        fileInstrumentsCreated++;
      }

      // Insert holding
      if (!dryRun) {
        insertHolding.run(schemeCode, row.instrument_id, weight, reportDate);
      }
      fileInserted++;
    }
  });

  if (!dryRun) {
    importFile();
  } else {
    // Still run the logic for counting, but in a savepoint we roll back
    importFile();
  }

  console.log(
    `  ${basename(file)}: ${fileInserted} holdings for scheme(s) ${[...schemeCodes].join(', ')}` +
      (fileInstrumentsCreated > 0 ? ` (${fileInstrumentsCreated} new instruments)` : '')
  );

  totalInserted += fileInserted;
  totalInstrumentsCreated += fileInstrumentsCreated;
}

console.log(
  `\n${dryRun ? '[DRY RUN] Would import' : 'Imported'} ${totalInserted} holdings total` +
    (totalInstrumentsCreated > 0 ? `, created ${totalInstrumentsCreated} new instruments` : '')
);

// Verify
if (!dryRun) {
  const count = db.prepare('SELECT COUNT(*) as c FROM portfolio_holdings').get();
  console.log(`Portfolio holdings table now has ${count.c} rows`);
}
