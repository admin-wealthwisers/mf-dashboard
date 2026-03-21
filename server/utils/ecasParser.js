/**
 * ECAS (Consolidated Account Statement) PDF Parser
 * Parses CAMS/KFintech CAS statements to extract mutual fund holdings
 * Handles: Purchases, Redemptions, SIP, SWP, Switch-In/Out, IDCW, Stamp Duty
 */

import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const pdfParse = _require('pdf-parse');

// Transaction types that ADD units
const ADD_UNIT_TYPES = [
  'purchase', 'purchase-bse', 'systematic investment',
  'sip', 'switch-in', 'switch in', 'idcw reinvest',
  'dividend reinvest', 'reinvestment', 'new fund offer',
  'nfo', 'merger-in', 'consolidation-in'
];

// Transaction types that REMOVE units
const REMOVE_UNIT_TYPES = [
  'redemption', 'switch-out', 'switch out', 'systematic withdrawal',
  'swp', 'merger-out', 'consolidation-out'
];

// Transaction types that are informational (no unit change)
const INFO_TYPES = [
  'stamp duty', 'address updated', 'registration of nominee',
  'change of address', 'change of bank', 'idcw paid', 'dividend paid',
  'pan updated', 'kyc', 'nomination'
];

function classifyTransaction(txnDesc) {
  const desc = txnDesc.toLowerCase();

  // Check informational first (stamp duty, address changes, etc.)
  for (const info of INFO_TYPES) {
    if (desc.includes(info)) return 'info';
  }

  // IDCW/Dividend reinvestment (adds units)
  if ((desc.includes('idcw') || desc.includes('dividend')) && desc.includes('reinvest')) {
    return 'add';
  }

  // IDCW/Dividend payout (no unit change, just cash)
  if ((desc.includes('idcw') || desc.includes('dividend')) && (desc.includes('paid') || desc.includes('payout'))) {
    return 'info';
  }

  // Check add types
  for (const add of ADD_UNIT_TYPES) {
    if (desc.includes(add)) return 'add';
  }

  // Check remove types
  for (const remove of REMOVE_UNIT_TYPES) {
    if (desc.includes(remove)) return 'remove';
  }

  // If has positive units, likely a purchase
  return 'unknown';
}

/**
 * Parse ECAS PDF buffer and extract holdings + transactions
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Object} { investor, holdings, summary }
 */
export async function parseECAS(pdfBuffer) {
  const data = await pdfParse(pdfBuffer);
  const text = data.text;
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Extract investor info from first page
  const investor = extractInvestorInfo(lines);

  // Extract holdings with transactions
  const holdings = extractHoldings(lines);

  // Build summary
  const summary = {
    totalCost: holdings.reduce((s, h) => s + h.costValue, 0),
    totalMarketValue: holdings.reduce((s, h) => s + h.marketValue, 0),
    totalHoldings: holdings.length,
    amcs: [...new Set(holdings.map(h => h.amc))].length,
  };
  summary.totalGain = summary.totalMarketValue - summary.totalCost;
  summary.totalGainPct = summary.totalCost > 0
    ? ((summary.totalGain / summary.totalCost) * 100)
    : 0;

  return { investor, holdings, summary };
}

function extractInvestorInfo(lines) {
  const info = { name: '', email: '', pan: '', mobile: '', address: '' };

  for (const line of lines.slice(0, 30)) {
    // Email
    const emailMatch = line.match(/Email\s*Id:\s*(\S+@\S+)/i);
    if (emailMatch) info.email = emailMatch[1];

    // PAN
    const panMatch = line.match(/PAN:\s*([A-Z]{5}\d{4}[A-Z])/);
    if (panMatch && !info.pan) info.pan = panMatch[1];

    // Mobile
    const mobileMatch = line.match(/Mobile:\s*(\d{10,})/);
    if (mobileMatch) info.mobile = mobileMatch[1];
  }

  // Name extraction: usually the line after email or 2nd content line
  for (const line of lines.slice(0, 20)) {
    if (line.match(/^[A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+/) && !line.includes('Consolidated') && !line.includes('PORTFOLIO')) {
      info.name = line.split(/\s{2,}/)[0].trim();
      break;
    }
    // Also try PAN-holding name format
    const nameAfterEmail = line.match(/Email Id:.*?\n?(.+)/);
    if (nameAfterEmail) {
      const candidate = nameAfterEmail[1].trim();
      if (candidate.length > 3 && !candidate.includes('This Consolidated')) {
        info.name = candidate;
      }
    }
  }

  // Fallback: find name from folio sections
  if (!info.name) {
    for (const line of lines) {
      const folioNameMatch = line.match(/Folio No:.*?PAN:.*?\n(.+)/);
      if (folioNameMatch) {
        info.name = folioNameMatch[1].trim();
        break;
      }
    }
  }

  return info;
}

function extractHoldings(lines) {
  const holdings = [];
  let currentAMC = '';
  let currentFolio = '';
  let currentFund = '';
  let currentISIN = '';
  let currentTransactions = [];

  // Build sequential arrays of closing balances, NAVs, and market values
  // pdf-parse v1 puts these on separate lines; we pair them by order of appearance
  const closingIndices = [];
  const navEntries = [];
  const mvEntries = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('Closing Unit Balance')) closingIndices.push(i);
    const navMatch = line.match(/NAV on\s*([\d-]+[A-Za-z]+-\d+):\s*INR\s*([\d,.]+)/);
    if (navMatch) navEntries.push({ navDate: navMatch[1], nav: parseFloat(navMatch[2].replace(/,/g, '')) });
    const mvMatch = line.match(/Market Value on\s*[\d-]+[A-Za-z]+-\d+:\s*INR\s*([\d,]+\.\d+)/);
    if (mvMatch) mvEntries.push(parseFloat(mvMatch[1].replace(/,/g, '')));
  }

  // Map closing line index → sequential NAV/MV (Nth closing line pairs with Nth NAV/MV)
  const navByClosingIdx = new Map();
  const mvByClosingIdx = new Map();
  for (let n = 0; n < closingIndices.length; n++) {
    if (n < navEntries.length) navByClosingIdx.set(closingIndices[n], navEntries[n]);
    if (n < mvEntries.length) mvByClosingIdx.set(closingIndices[n], mvEntries[n]);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect AMC headers
    const amcMatch = line.match(/^[\s]*(.*?Mutual Fund)\s*$/i);
    if (amcMatch && !line.includes('Folio') && !line.includes('ISIN') && !line.includes('Closing')) {
      const candidate = amcMatch[1].trim();
      if (candidate.length < 80 && !candidate.includes('Growth') && !candidate.includes('IDCW') && !candidate.includes('Regular') && !candidate.includes('Plan')) {
        currentAMC = candidate;
      }
    }

    // Detect Folio
    const folioMatch = line.match(/Folio No:\s*([^\s]+)/);
    if (folioMatch) {
      currentFolio = folioMatch[1].replace(/[\s/]+$/, '');
      currentTransactions = [];
    }

    // Detect fund name + ISIN (may be on same or different lines)
    const isinMatch = line.match(/ISIN:\s*(INF\w+)/);
    if (isinMatch) {
      currentISIN = isinMatch[1].replace(/[()]/g, '');

      // Fund name could be on this line or the previous line
      let fundName = line;
      if (fundName.indexOf('ISIN') > 0) {
        fundName = fundName.substring(0, fundName.indexOf('ISIN')).trim();
      } else if (i > 0) {
        fundName = lines[i - 1].trim();
      }
      // Clean up fund name
      fundName = fundName.replace(/^[A-Z0-9]+[-]/, '').trim();
      fundName = fundName.replace(/\s*[-]\s*Registrar\s*:.*$/i, '').trim();
      fundName = fundName.replace(/\s*\((Non-)?Demat\)\s*/gi, '').trim();
      fundName = fundName.replace(/\s*\(Advisor:.*?\)\s*/gi, '').trim();
      fundName = fundName.replace(/\s*[-]\s*$/, '').trim();
      if (fundName.length > 3) currentFund = fundName;
    }

    // Detect transactions (date + description + amount + units + price + balance)
    // pdf-parse v1 may merge columns: "07-Jun-201016,434.52208.69278.75208.692Switch-In..."
    // or keep them spaced: "07-Jun-2010 Switch-In - From International... 16,434.52 208.692 78.75 208.692"
    const txnMatch = line.match(/^(\d{2}-[A-Za-z]{3}-\d{4})\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{3})\s+([\d,.]+)\s+([\d,]+\.\d{3})/);
    if (txnMatch) {
      const [, date, description, amount, units, price, balance] = txnMatch;
      currentTransactions.push({
        date,
        description: description.trim(),
        amount: parseFloat(amount.replace(/,/g, '')),
        units: parseFloat(units.replace(/,/g, '')),
        price: parseFloat(price.replace(/,/g, '')),
        balance: parseFloat(balance.replace(/,/g, '')),
        type: classifyTransaction(description)
      });
    }

    // Detect Closing Unit Balance — handles both single-line and multi-line formats
    const closingMatch = line.match(/Closing Unit Balance:\s*([\d,]+\.\d+)/);
    if (closingMatch) {
      const units = parseFloat(closingMatch[1].replace(/,/g, ''));

      // Extract cost value from same line or nearby
      let costValue = 0;
      const costMatch = line.match(/Total Cost Value:\s*([\d,]+\.\d+)/);
      if (costMatch) {
        costValue = parseFloat(costMatch[1].replace(/,/g, ''));
      } else {
        // Check next few lines
        for (let j = i; j <= Math.min(i + 3, lines.length - 1); j++) {
          const cm = lines[j].match(/Total Cost Value:\s*([\d,]+\.\d+)/);
          if (cm) { costValue = parseFloat(cm[1].replace(/,/g, '')); break; }
        }
      }

      // Get NAV from lookup
      const navInfo = navByClosingIdx.get(i) || { navDate: '', nav: 0 };
      const marketValue = mvByClosingIdx.get(i) || 0;

      // Only add if units > 0
      if (units > 0) {
        const totalPurchased = currentTransactions
          .filter(t => t.type === 'add')
          .reduce((s, t) => s + t.amount, 0);

        const totalRedeemed = currentTransactions
          .filter(t => t.type === 'remove')
          .reduce((s, t) => s + Math.abs(t.amount), 0);

        const sipCount = currentTransactions
          .filter(t => {
            const d = t.description.toLowerCase();
            return d.includes('systematic investment') || d.includes('sip');
          }).length;

        holdings.push({
          amc: currentAMC,
          folio: currentFolio,
          fundName: currentFund,
          isin: currentISIN,
          units,
          nav: navInfo.nav,
          navDate: navInfo.navDate,
          costValue,
          marketValue,
          gain: marketValue - costValue,
          gainPct: costValue > 0 ? ((marketValue - costValue) / costValue) * 100 : 0,
          transactions: currentTransactions.length,
          totalPurchased,
          totalRedeemed,
          sipCount,
          transactionHistory: currentTransactions.map(t => ({
            date: t.date,
            type: t.description,
            amount: t.amount,
            units: t.units,
            balance: t.balance
          }))
        });
      }

      currentTransactions = [];
    }
  }

  return holdings;
}

/**
 * Match ECAS holdings ISINs to scheme codes in our database
 * @param {Array} holdings - Parsed holdings from ECAS
 * @param {Object} db - better-sqlite3 database instance
 * @returns {Array} Holdings with matched scheme_codes
 */
export function matchToDatabase(holdings, db) {
  // Try matching by ISIN first, then by fuzzy name match
  const findByISIN = db.prepare(`
    SELECT scheme_code, scheme_name FROM schemes
    WHERE scheme_name LIKE '%' || ? || '%'
    LIMIT 1
  `);

  const findByName = db.prepare(`
    SELECT scheme_code, scheme_name FROM schemes
    WHERE LOWER(scheme_name) LIKE '%' || LOWER(?) || '%'
    ORDER BY LENGTH(scheme_name) ASC
    LIMIT 1
  `);

  return holdings.map(h => {
    let match = null;

    // Try ISIN match (ISIN is in scheme name for some records)
    if (h.isin) {
      match = findByISIN.get(h.isin);
    }

    // Try fuzzy name match — multiple strategies
    if (!match && h.fundName) {
      // Strategy 1: Use full cleaned fund name (up to 6 words)
      const cleaned = h.fundName
        .replace(/-\s*(Regular|Direct)\s*(Plan)?/gi, '')
        .replace(/\(formerly.*?\)/gi, '')
        .replace(/\(erstwhile.*?\)/gi, '')
        .replace(/\s*-\s*(Growth|IDCW|Payout|Reinvestment)\s*(Option|Plan)?/gi, '')
        .replace(/\s+(Growth|IDCW)\s*$/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Try with first 6 words
      const words = cleaned.split(' ').slice(0, 6).join(' ');
      if (words.length > 5) match = findByName.get(words);

      // Strategy 2: Try with first 4 words if 6 didn't match
      if (!match) {
        const short = cleaned.split(' ').slice(0, 4).join(' ');
        if (short.length > 5) match = findByName.get(short);
      }

      // Strategy 3: Try with just the AMC + fund type (e.g. "HDFC Defence Fund")
      if (!match) {
        const core = cleaned.split(' ').slice(0, 3).join(' ');
        if (core.length > 5) match = findByName.get(core);
      }
    }

    return {
      ...h,
      schemeCode: match?.scheme_code || null,
      matchedSchemeName: match?.scheme_name || null,
      matched: !!match
    };
  });
}
