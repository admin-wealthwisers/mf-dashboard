/**
 * Seed the instruments table with ~25 major Indian stocks.
 * Run: node scripts/seedInstruments.js
 */
import db from '../server/db.js';

const INSTRUMENTS = [
  { name: 'HDFC Bank Ltd', isin: 'INE040A01034', asset_class: 'Equity', sector: 'Banking' },
  { name: 'ICICI Bank Ltd', isin: 'INE090A01021', asset_class: 'Equity', sector: 'Banking' },
  { name: 'State Bank of India', isin: 'INE062A01020', asset_class: 'Equity', sector: 'Banking' },
  { name: 'Axis Bank Ltd', isin: 'INE238A01034', asset_class: 'Equity', sector: 'Banking' },
  { name: 'Kotak Mahindra Bank Ltd', isin: 'INE237A01028', asset_class: 'Equity', sector: 'Banking' },
  { name: 'Bajaj Finance Ltd', isin: 'INE296A01024', asset_class: 'Equity', sector: 'Banking' },
  { name: 'Infosys Ltd', isin: 'INE009A01021', asset_class: 'Equity', sector: 'IT' },
  { name: 'Tata Consultancy Services Ltd', isin: 'INE467B01029', asset_class: 'Equity', sector: 'IT' },
  { name: 'Wipro Ltd', isin: 'INE075A01022', asset_class: 'Equity', sector: 'IT' },
  { name: 'HCL Technologies Ltd', isin: 'INE860A01027', asset_class: 'Equity', sector: 'IT' },
  { name: 'Reliance Industries Ltd', isin: 'INE002A01018', asset_class: 'Equity', sector: 'Energy' },
  { name: 'Bharti Airtel Ltd', isin: 'INE397D01024', asset_class: 'Equity', sector: 'Telecom' },
  { name: 'Larsen & Toubro Ltd', isin: 'INE018A01030', asset_class: 'Equity', sector: 'Construction' },
  { name: 'Asian Paints Ltd', isin: 'INE021A01026', asset_class: 'Equity', sector: 'FMCG' },
  { name: 'Hindustan Unilever Ltd', isin: 'INE030A01027', asset_class: 'Equity', sector: 'FMCG' },
  { name: 'Nestle India Ltd', isin: 'INE239A01016', asset_class: 'Equity', sector: 'FMCG' },
  { name: 'Maruti Suzuki India Ltd', isin: 'INE585B01010', asset_class: 'Equity', sector: 'Auto' },
  { name: 'Titan Company Ltd', isin: 'INE280A01028', asset_class: 'Equity', sector: 'Consumer Durables' },
  { name: 'Sun Pharmaceutical Industries Ltd', isin: 'INE044A01036', asset_class: 'Equity', sector: 'Pharma' },
  { name: 'UltraTech Cement Ltd', isin: 'INE481G01011', asset_class: 'Equity', sector: 'Cement' },
  { name: 'ITC Ltd', isin: 'INE154A01025', asset_class: 'Equity', sector: 'FMCG' },
  { name: 'Power Grid Corporation of India Ltd', isin: 'INE752E01010', asset_class: 'Equity', sector: 'Energy' },
  { name: 'NTPC Ltd', isin: 'INE733E01010', asset_class: 'Equity', sector: 'Energy' },
  { name: 'Mahindra & Mahindra Ltd', isin: 'INE101A01026', asset_class: 'Equity', sector: 'Auto' },
  { name: 'Divi\'s Laboratories Ltd', isin: 'INE361B01024', asset_class: 'Equity', sector: 'Pharma' },
  // Debt instruments for debt fund
  { name: 'GOI 7.26% 2033', isin: 'IN0020220073', asset_class: 'Debt', sector: 'Government Securities' },
  { name: 'SBI 7.49% 2028 NCD', isin: 'INE062A08314', asset_class: 'Debt', sector: 'Banking' },
  { name: 'HDFC Bank 7.35% 2027 NCD', isin: 'INE040A08310', asset_class: 'Debt', sector: 'Banking' },
  { name: 'NABARD 7.40% 2029', isin: 'INE261F08270', asset_class: 'Debt', sector: 'Government Securities' },
  { name: 'PFC 7.55% 2030 NCD', isin: 'INE134E08KD0', asset_class: 'Debt', sector: 'Energy' },
];

const insert = db.prepare(
  `INSERT OR IGNORE INTO instruments (name, isin, asset_class, sector, country)
   VALUES (?, ?, ?, ?, 'India')`
);

const insertMany = db.transaction(() => {
  let inserted = 0;
  for (const inst of INSTRUMENTS) {
    const result = insert.run(inst.name, inst.isin, inst.asset_class, inst.sector);
    if (result.changes > 0) inserted++;
  }
  return inserted;
});

const count = insertMany();
console.log(`Seeded ${count} new instruments (${INSTRUMENTS.length} total defined, skipped duplicates)`);

const all = db.prepare('SELECT instrument_id, name, isin, sector FROM instruments ORDER BY instrument_id').all();
console.log(`\nInstruments table now has ${all.length} rows:`);
all.forEach((r) => console.log(`  [${r.instrument_id}] ${r.name} (${r.isin}) — ${r.sector}`));
