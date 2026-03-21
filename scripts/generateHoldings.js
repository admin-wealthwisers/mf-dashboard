/**
 * Generate realistic sample holdings CSVs for all schemes.
 * Run: node scripts/generateHoldings.js
 */
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import db from '../server/db.js';

const outDir = resolve('data/holdings');
mkdirSync(outDir, { recursive: true });

const schemes = db.prepare('SELECT scheme_code, scheme_name, sub_category FROM schemes').all();
const instruments = db.prepare('SELECT instrument_id, name, isin, asset_class, sector FROM instruments').all();

const equity = instruments.filter((i) => i.asset_class === 'Equity');
const debt = instruments.filter((i) => i.asset_class === 'Debt');

const REPORT_DATE = '2025-12-31';

// Portfolio templates by fund type
const PORTFOLIOS = {
  // SBI Large Cap - heavy on large cap blue chips
  '119598': {
    picks: [
      { isin: 'INE002A01018', w: 0.095 }, // Reliance
      { isin: 'INE040A01034', w: 0.088 }, // HDFC Bank
      { isin: 'INE090A01021', w: 0.082 }, // ICICI Bank
      { isin: 'INE467B01029', w: 0.075 }, // TCS
      { isin: 'INE009A01021', w: 0.070 }, // Infosys
      { isin: 'INE154A01025', w: 0.062 }, // ITC
      { isin: 'INE030A01027', w: 0.055 }, // HUL
      { isin: 'INE397D01024', w: 0.050 }, // Bharti Airtel
      { isin: 'INE018A01030', w: 0.048 }, // L&T
      { isin: 'INE062A01020', w: 0.042 }, // SBI
      { isin: 'INE237A01028', w: 0.038 }, // Kotak
      { isin: 'INE044A01036', w: 0.035 }, // Sun Pharma
      { isin: 'INE585B01010', w: 0.032 }, // Maruti
      { isin: 'INE101A01026', w: 0.030 }, // M&M
      { isin: 'INE860A01027', w: 0.028 }, // HCL Tech
      { isin: 'INE752E01010', w: 0.025 }, // Power Grid
      { isin: 'INE733E01010', w: 0.022 }, // NTPC
      { isin: 'INE481G01011', w: 0.020 }, // UltraTech
      { isin: 'INE280A01028', w: 0.018 }, // Titan
      { isin: 'INE296A01024', w: 0.015 }, // Bajaj Finance
    ],
  },
  // Axis ELSS Tax Saver - diversified equity, slightly aggressive
  '120503': {
    picks: [
      { isin: 'INE040A01034', w: 0.082 }, // HDFC Bank
      { isin: 'INE090A01021', w: 0.075 }, // ICICI Bank
      { isin: 'INE009A01021', w: 0.068 }, // Infosys
      { isin: 'INE002A01018', w: 0.065 }, // Reliance
      { isin: 'INE296A01024', w: 0.058 }, // Bajaj Finance
      { isin: 'INE467B01029', w: 0.055 }, // TCS
      { isin: 'INE280A01028', w: 0.050 }, // Titan
      { isin: 'INE397D01024', w: 0.045 }, // Bharti Airtel
      { isin: 'INE018A01030', w: 0.042 }, // L&T
      { isin: 'INE021A01026', w: 0.038 }, // Asian Paints
      { isin: 'INE239A01016', w: 0.035 }, // Nestle
      { isin: 'INE030A01027', w: 0.032 }, // HUL
      { isin: 'INE044A01036', w: 0.030 }, // Sun Pharma
      { isin: 'INE585B01010', w: 0.028 }, // Maruti
      { isin: 'INE860A01027', w: 0.025 }, // HCL Tech
      { isin: 'INE237A01028', w: 0.022 }, // Kotak
      { isin: 'INE481G01011', w: 0.020 }, // UltraTech
      { isin: 'INE154A01025', w: 0.018 }, // ITC
      { isin: 'INE361B01024', w: 0.015 }, // Divi's
      { isin: 'INE075A01022', w: 0.012 }, // Wipro
    ],
  },
  // Axis Midcap - more concentrated mid-cap tilt
  '120505': {
    picks: [
      { isin: 'INE280A01028', w: 0.072 }, // Titan
      { isin: 'INE361B01024', w: 0.065 }, // Divi's
      { isin: 'INE296A01024', w: 0.060 }, // Bajaj Finance
      { isin: 'INE481G01011', w: 0.055 }, // UltraTech
      { isin: 'INE021A01026', w: 0.052 }, // Asian Paints
      { isin: 'INE044A01036', w: 0.048 }, // Sun Pharma
      { isin: 'INE239A01016', w: 0.045 }, // Nestle
      { isin: 'INE585B01010', w: 0.042 }, // Maruti
      { isin: 'INE101A01026', w: 0.040 }, // M&M
      { isin: 'INE860A01027', w: 0.038 }, // HCL Tech
      { isin: 'INE075A01022', w: 0.035 }, // Wipro
      { isin: 'INE018A01030', w: 0.032 }, // L&T
      { isin: 'INE397D01024', w: 0.030 }, // Bharti Airtel
      { isin: 'INE733E01010', w: 0.028 }, // NTPC
      { isin: 'INE752E01010', w: 0.025 }, // Power Grid
      { isin: 'INE154A01025', w: 0.022 }, // ITC
      { isin: 'INE238A01034', w: 0.020 }, // Axis Bank
      { isin: 'INE030A01027', w: 0.018 }, // HUL
    ],
  },
  // ICICI Pru Equity & Debt (Hybrid) - mix of equity + some debt-like names
  '100356': {
    picks: [
      { isin: 'INE040A01034', w: 0.072 }, // HDFC Bank
      { isin: 'INE002A01018', w: 0.068 }, // Reliance
      { isin: 'INE090A01021', w: 0.060 }, // ICICI Bank
      { isin: 'INE009A01021', w: 0.055 }, // Infosys
      { isin: 'INE467B01029', w: 0.048 }, // TCS
      { isin: 'INE062A01020', w: 0.042 }, // SBI
      { isin: 'INE018A01030', w: 0.038 }, // L&T
      { isin: 'INE397D01024', w: 0.035 }, // Bharti Airtel
      { isin: 'INE154A01025', w: 0.032 }, // ITC
      { isin: 'INE044A01036', w: 0.028 }, // Sun Pharma
      { isin: 'INE585B01010', w: 0.025 }, // Maruti
      { isin: 'INE030A01027', w: 0.022 }, // HUL
      { isin: 'INE733E01010', w: 0.020 }, // NTPC
      { isin: 'INE752E01010', w: 0.018 }, // Power Grid
      { isin: 'IN0020220073', w: 0.085 }, // GOI bond
      { isin: 'INE062A08314', w: 0.065 }, // SBI NCD
      { isin: 'INE040A08310', w: 0.055 }, // HDFC NCD
      { isin: 'INE261F08270', w: 0.045 }, // NABARD
    ],
  },
  // HDFC Mid Cap - mid cap focused
  '118989': {
    picks: [
      { isin: 'INE296A01024', w: 0.068 }, // Bajaj Finance
      { isin: 'INE280A01028', w: 0.062 }, // Titan
      { isin: 'INE021A01026', w: 0.058 }, // Asian Paints
      { isin: 'INE361B01024', w: 0.052 }, // Divi's
      { isin: 'INE481G01011', w: 0.048 }, // UltraTech
      { isin: 'INE239A01016', w: 0.045 }, // Nestle
      { isin: 'INE101A01026', w: 0.042 }, // M&M
      { isin: 'INE044A01036', w: 0.040 }, // Sun Pharma
      { isin: 'INE860A01027', w: 0.038 }, // HCL Tech
      { isin: 'INE075A01022', w: 0.035 }, // Wipro
      { isin: 'INE585B01010', w: 0.032 }, // Maruti
      { isin: 'INE397D01024', w: 0.030 }, // Bharti Airtel
      { isin: 'INE018A01030', w: 0.028 }, // L&T
      { isin: 'INE154A01025', w: 0.025 }, // ITC
      { isin: 'INE733E01010', w: 0.022 }, // NTPC
      { isin: 'INE238A01034', w: 0.020 }, // Axis Bank
      { isin: 'INE030A01027', w: 0.018 }, // HUL
      { isin: 'INE237A01028', w: 0.015 }, // Kotak
    ],
  },
  // Franklin ELSS
  '100526': {
    picks: [
      { isin: 'INE090A01021', w: 0.078 }, // ICICI Bank
      { isin: 'INE040A01034', w: 0.072 }, // HDFC Bank
      { isin: 'INE009A01021', w: 0.065 }, // Infosys
      { isin: 'INE002A01018', w: 0.060 }, // Reliance
      { isin: 'INE062A01020', w: 0.052 }, // SBI
      { isin: 'INE467B01029', w: 0.048 }, // TCS
      { isin: 'INE018A01030', w: 0.045 }, // L&T
      { isin: 'INE154A01025', w: 0.040 }, // ITC
      { isin: 'INE397D01024', w: 0.038 }, // Bharti Airtel
      { isin: 'INE296A01024', w: 0.035 }, // Bajaj Finance
      { isin: 'INE044A01036', w: 0.032 }, // Sun Pharma
      { isin: 'INE237A01028', w: 0.028 }, // Kotak
      { isin: 'INE585B01010', w: 0.025 }, // Maruti
      { isin: 'INE030A01027', w: 0.022 }, // HUL
      { isin: 'INE860A01027', w: 0.020 }, // HCL Tech
      { isin: 'INE280A01028', w: 0.018 }, // Titan
      { isin: 'INE101A01026', w: 0.015 }, // M&M
      { isin: 'INE481G01011', w: 0.012 }, // UltraTech
    ],
  },
  // Aditya Birla Banking & PSU Debt - DIRECT (debt focused)
  '119551': {
    picks: [
      { isin: 'IN0020220073', w: 0.22 },  // GOI bond
      { isin: 'INE062A08314', w: 0.18 },  // SBI NCD
      { isin: 'INE040A08310', w: 0.16 },  // HDFC NCD
      { isin: 'INE261F08270', w: 0.14 },  // NABARD
      { isin: 'INE134E08KD0', w: 0.12 },  // PFC NCD
    ],
  },
  // Aditya Birla Banking & PSU Debt - REGULAR (same holdings, similar weights)
  '108272': {
    picks: [
      { isin: 'IN0020220073', w: 0.21 },
      { isin: 'INE062A08314', w: 0.17 },
      { isin: 'INE040A08310', w: 0.15 },
      { isin: 'INE261F08270', w: 0.14 },
      { isin: 'INE134E08KD0', w: 0.13 },
    ],
  },
  // Reliance Gilt Securities
  '109725': {
    picks: [
      { isin: 'IN0020220073', w: 0.35 },  // GOI bond
      { isin: 'INE261F08270', w: 0.25 },  // NABARD
      { isin: 'INE134E08KD0', w: 0.20 },  // PFC NCD
      { isin: 'INE062A08314', w: 0.10 },  // SBI NCD
    ],
  },
};

// Build ISIN → instrument name map
const isinMap = new Map(instruments.map((i) => [i.isin, i.name]));

for (const [code, portfolio] of Object.entries(PORTFOLIOS)) {
  const scheme = schemes.find((s) => s.scheme_code === code);
  if (!scheme) {
    console.log(`Warning: scheme ${code} not in DB, skipping`);
    continue;
  }

  const lines = ['scheme_code,instrument,isin,weight,report_date'];
  for (const { isin, w } of portfolio.picks) {
    const name = isinMap.get(isin) || 'Unknown';
    lines.push(`${code},${name},${isin},${w},${REPORT_DATE}`);
  }

  const totalWeight = portfolio.picks.reduce((s, p) => s + p.w, 0);
  const filename = `${code}.csv`;
  writeFileSync(resolve(outDir, filename), lines.join('\n') + '\n');
  console.log(`  ${filename}: ${portfolio.picks.length} holdings, total weight ${(totalWeight * 100).toFixed(1)}% — ${scheme.scheme_name.slice(0, 50)}`);
}

console.log(`\nGenerated ${Object.keys(PORTFOLIOS).length} CSV files in data/holdings/`);
