const fs = require('fs');
const path = require('path');

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQuotes = !inQuotes; continue; }
        if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
        current += ch;
    }
    result.push(current.trim());
    return result;
}

const csv = fs.readFileSync(path.join(__dirname, 'input', 'arizon.ai-ksa-home-2023-2026.csv'), 'utf-8');
const lines = csv.split('\n').filter(l => l.trim());
const headers = parseCSVLine(lines[0]);

const campaigns = new Map();
const ads = new Map();

for (let i = 2; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });

    const camp = row['Campaign name'] || 'Unknown';
    const ad = row['Ads'] || 'Unknown';
    const spend = parseFloat(row['Amount spent (USD)']) || 0;
    const results = parseFloat(row['Results']) || 0;
    const reach = parseFloat(row['Reach']) || 0;
    const impressions = parseFloat(row['Impressions']) || 0;
    const clicks = parseFloat(row['Clicks (all)']) || 0;
    const linkClicks = parseFloat(row['Link clicks']) || 0;
    const comments = parseFloat(row['Post comments']) || 0;
    const engagements = parseFloat(row['Post engagements']) || 0;
    const igVisits = parseFloat(row['Instagram profile visits']) || 0;
    const views = parseFloat(row['Views']) || 0;
    const resultType = row['Result type'] || '';

    if (!campaigns.has(camp)) campaigns.set(camp, { spend: 0, results: 0, reach: 0, impressions: 0, clicks: 0, linkClicks: 0, comments: 0, engagements: 0, igVisits: 0, views: 0, rows: 0, resultTypes: new Set(), ads: new Set() });
    const c = campaigns.get(camp);
    c.spend += spend; c.results += results; c.reach += reach; c.impressions += impressions;
    c.clicks += clicks; c.linkClicks += linkClicks; c.comments += comments; c.engagements += engagements;
    c.igVisits += igVisits; c.views += views; c.rows++; if (resultType) c.resultTypes.add(resultType); c.ads.add(ad);

    if (!ads.has(ad)) ads.set(ad, { spend: 0, results: 0, reach: 0, impressions: 0, clicks: 0, linkClicks: 0, comments: 0, engagements: 0, igVisits: 0, views: 0, rows: 0, resultTypes: new Set(), campaigns: new Set() });
    const a = ads.get(ad);
    a.spend += spend; a.results += results; a.reach += reach; a.impressions += impressions;
    a.clicks += clicks; a.linkClicks += linkClicks; a.comments += comments; a.engagements += engagements;
    a.igVisits += igVisits; a.views += views; a.rows++; if (resultType) a.resultTypes.add(resultType); a.campaigns.add(camp);
}

console.log('=== CAMPAIGNS (' + campaigns.size + ') ===\n');
[...campaigns.entries()].sort((a, b) => b[1].spend - a[1].spend).forEach(([name, d]) => {
    const cpr = d.results > 0 ? (d.spend / d.results).toFixed(4) : 'N/A';
    console.log(`  [${name}]`);
    console.log(`    Spend=$${d.spend.toFixed(2)} | Results=${d.results} | CPR=$${cpr} | Reach=${d.reach} | Clicks=${d.clicks}`);
    console.log(`    ResultTypes: ${[...d.resultTypes].join(', ')}`);
    console.log(`    Ads (${d.ads.size}): ${[...d.ads].map(a => a.substring(0, 60)).join(' | ')}`);
    console.log('');
});

console.log('\n=== ADS/CREATIVES (' + ads.size + ') ===\n');
[...ads.entries()].sort((a, b) => b[1].spend - a[1].spend).forEach(([name, d]) => {
    const cpr = d.results > 0 ? (d.spend / d.results).toFixed(4) : 'N/A';
    console.log(`  [${name}]`);
    console.log(`    Spend=$${d.spend.toFixed(2)} | Results=${d.results} | CPR=$${cpr} | Reach=${d.reach} | Comments=${d.comments} | Engagements=${d.engagements}`);
    console.log(`    Views=${d.views} | IGVisits=${d.igVisits} | ResultTypes: ${[...d.resultTypes].join(', ')}`);
    console.log('');
});
