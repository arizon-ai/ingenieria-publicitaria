const fs = require('fs');
const path = require('path');

// === CSV PARSER ===
function parseCSVLine(line) {
    const result = []; let current = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQuotes = !inQuotes; continue; }
        if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
        current += ch;
    }
    result.push(current.trim());
    return result;
}

function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }

// === LOAD DATA ===
const csvPath = path.join(__dirname, 'input', 'arizon.ai-ksa-home-2023-2026.csv');
const csv = fs.readFileSync(csvPath, 'utf-8');
const lines = csv.split('\n').filter(l => l.trim());
const headers = parseCSVLine(lines[0]);

const rows = [];
for (let i = 2; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    if (vals.length < 10) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
    // Skip malformed rows (Nuestro... with inline CSV)
    if (row['Campaign name'] && row['Campaign name'].includes(',')) continue;
    if (!row['Campaign name'] || row['Campaign name'] === '') continue;
    rows.push(row);
}
console.log(`Parsed ${rows.length} valid data rows`);

// === HELPER: CREATIVE CATEGORIZATION ===
function categorizeCreative(name) {
    const lower = name.toLowerCase();
    // Offers/Promotions
    if (/oferta|promo|precio|ahorra|locura|green week|descuento|imperdible|semana de/i.test(lower)) return 'Ofertas/Promociones';
    // Seasonal
    if (/navidad|papa|padre|celebra|dale vida/i.test(lower)) return 'Temporalidad/Fechas';
    // Ceramics
    if (/cer[aá]mica|porcelanato|ba[ñn]o merece|lujo.*ba[ñn]o/i.test(lower)) return 'Cerámicas/Baños';
    // Paint
    if (/pint|ahorrar y pintar/i.test(lower)) return 'Pinturas';
    // Faucet/Grifería
    if (/faucet|ma faucet|grifer/i.test(lower)) return 'Grifería/MA Faucet';
    // Tanks
    if (/tanque|cansado de tanques/i.test(lower)) return 'Tanques de Agua';
    // Drywall
    if (/drywall/i.test(lower)) return 'Drywall';
    // Electrical
    if (/conexi[oó]n|el[eé]ctric/i.test(lower)) return 'Eléctricos';
    // Construction
    if (/constructor|atenci[oó]n constructores|pr[oó]ximo proyecto/i.test(lower)) return 'Construcción General';
    // Traffic/Leads
    if (/tr[aá]fico|mot 06|campa[ñn]a mot/i.test(lower)) return 'Tráfico/Leads';
    // Calls
    if (/insuperable|call|llamada/i.test(lower)) return 'Llamadas';
    // Messaging
    if (/tr[ií]o din[aá]mico|messaging/i.test(lower)) return 'Mensajería';
    // Lifestyle/Brand
    if (/pov|jaque mate|caterina|nos encanta|lluvia|instagram post/i.test(lower)) return 'Brand/Lifestyle';
    return 'Brand/Lifestyle';
}

// === CREATIVE CONTENT TYPE ===
function classifyContentType(name) {
    const lower = name.toLowerCase();
    if (/oferta|promo|precio|ahorra|descuento|locura|insuperable|semana/i.test(lower)) return 'Oferta Directa';
    if (/pov|jaque mate|caterina|nos encanta/i.test(lower)) return 'Storytelling/Lifestyle';
    if (/atenci[oó]n|alerta|as[ií] es|para cerrar|el momento/i.test(lower)) return 'Urgencia/FOMO';
    if (/merece|lujo|planeando|pr[oó]ximo proyecto|dale.*hogar/i.test(lower)) return 'Aspiracional';
    if (/producto ma|faucet|tanque|conexi[oó]n|drywall|porcelanato/i.test(lower)) return 'Producto Específico';
    if (/navidad|papa|padre|celebra|green week/i.test(lower)) return 'Temporal/Estacional';
    if (/tr[aá]fico|mot|campa[ñn]a/i.test(lower)) return 'Tráfico Directo';
    if (/te damos|damos m[aá]s/i.test(lower)) return 'Propuesta de Valor';
    if (/lluvia|atenci[oó]n!/i.test(lower)) return 'Problema/Solución';
    return 'General';
}

// === AGGREGATE BY AD (CREATIVE) ===
const creatives = new Map();
const categories = new Map();
const contentTypes = new Map();
const demographics = { byAge: new Map(), byGender: new Map(), byAgeGender: new Map() };
const resultTypes = new Map();
const temporal = new Map(); // by month

rows.forEach(row => {
    const ad = row['Ads'] || row['Campaign name'];
    const spend = num(row['Amount spent (USD)']);
    const results = num(row['Results']);
    const reach = num(row['Reach']);
    const impressions = num(row['Impressions']);
    const clicks = num(row['Clicks (all)']);
    const linkClicks = num(row['Link clicks']);
    const comments = num(row['Post comments']);
    const engagements = num(row['Post engagements']);
    const igVisits = num(row['Instagram profile visits']);
    const views = num(row['Views']);
    const v25 = num(row['Video plays at 25%']);
    const v50 = num(row['Video plays at 50%']);
    const v75 = num(row['Video plays at 75%']);
    const v95 = num(row['Video plays at 95%']);
    const v100 = num(row['Video plays at 100%']);
    const freq = num(row['Frequency']);
    const ctrAll = num(row['CTR (all)']);
    const resType = row['Result type'] || '';
    const age = row['Age'] || '';
    const gender = row['Gender'] || '';
    const startDate = row['Reporting starts'] || '';

    const cat = categorizeCreative(ad);
    const cType = classifyContentType(ad);

    // Aggregate by creative
    if (!creatives.has(ad)) creatives.set(ad, { spend: 0, results: 0, reach: 0, impressions: 0, clicks: 0, linkClicks: 0, comments: 0, engagements: 0, igVisits: 0, views: 0, v25: 0, v50: 0, v75: 0, v95: 0, v100: 0, rows: 0, resultTypes: new Set(), category: cat, contentType: cType, ages: {}, genders: {} });
    const c = creatives.get(ad);
    c.spend += spend; c.results += results; c.reach += reach; c.impressions += impressions;
    c.clicks += clicks; c.linkClicks += linkClicks; c.comments += comments; c.engagements += engagements;
    c.igVisits += igVisits; c.views += views; c.v25 += v25; c.v50 += v50; c.v75 += v75; c.v95 += v95; c.v100 += v100;
    c.rows++; if (resType) c.resultTypes.add(resType);

    // Category aggregation
    if (!categories.has(cat)) categories.set(cat, { spend: 0, results: 0, reach: 0, impressions: 0, clicks: 0, comments: 0, engagements: 0, igVisits: 0, creatives: new Set(), rows: 0 });
    const catAgg = categories.get(cat);
    catAgg.spend += spend; catAgg.results += results; catAgg.reach += reach; catAgg.impressions += impressions;
    catAgg.clicks += clicks; catAgg.comments += comments; catAgg.engagements += engagements; catAgg.igVisits += igVisits;
    catAgg.creatives.add(ad); catAgg.rows++;

    // Content type aggregation
    if (!contentTypes.has(cType)) contentTypes.set(cType, { spend: 0, results: 0, reach: 0, clicks: 0, comments: 0, engagements: 0, creatives: new Set(), rows: 0 });
    const ctAgg = contentTypes.get(cType);
    ctAgg.spend += spend; ctAgg.results += results; ctAgg.reach += reach; ctAgg.clicks += clicks;
    ctAgg.comments += comments; ctAgg.engagements += engagements; ctAgg.creatives.add(ad); ctAgg.rows++;

    // Demographics
    if (age) {
        if (!demographics.byAge.has(age)) demographics.byAge.set(age, { spend: 0, results: 0, reach: 0, impressions: 0, clicks: 0, linkClicks: 0, comments: 0, v100: 0, v25: 0, rows: 0 });
        const a = demographics.byAge.get(age);
        a.spend += spend; a.results += results; a.reach += reach; a.impressions += impressions; a.clicks += clicks; a.linkClicks += linkClicks; a.comments += comments; a.v100 += v100; a.v25 += v25; a.rows++;
    }
    if (gender) {
        if (!demographics.byGender.has(gender)) demographics.byGender.set(gender, { spend: 0, results: 0, reach: 0, impressions: 0, clicks: 0, linkClicks: 0, comments: 0, freq: 0, freqCount: 0, rows: 0 });
        const g = demographics.byGender.get(gender);
        g.spend += spend; g.results += results; g.reach += reach; g.impressions += impressions; g.clicks += clicks; g.linkClicks += linkClicks; g.comments += comments; if (freq > 0) { g.freq += freq; g.freqCount++; } g.rows++;
    }
    if (age && gender) {
        const key = `${age}|${gender}`;
        if (!demographics.byAgeGender.has(key)) demographics.byAgeGender.set(key, { spend: 0, results: 0, reach: 0, clicks: 0, rows: 0 });
        const ag = demographics.byAgeGender.get(key);
        ag.spend += spend; ag.results += results; ag.reach += reach; ag.clicks += clicks; ag.rows++;
    }

    // Result types
    if (resType) {
        if (!resultTypes.has(resType)) resultTypes.set(resType, { spend: 0, results: 0, reach: 0, rows: 0 });
        const rt = resultTypes.get(resType);
        rt.spend += spend; rt.results += results; rt.reach += reach; rt.rows++;
    }
});

// === COMPUTE CREATIVE METRICS ===
const creativeAnalysis = [...creatives.entries()].map(([name, d]) => {
    const cpr = d.results > 0 ? d.spend / d.results : null;
    const cpe = d.engagements > 0 ? d.spend / d.engagements : null;
    const engRate = d.reach > 0 ? (d.engagements / d.reach * 100) : 0;
    const commentRate = d.reach > 0 ? (d.comments / d.reach * 10000) : 0; // per 10K reach
    const ctr = d.impressions > 0 ? (d.clicks / d.impressions * 100) : 0;
    const ret100 = d.v25 > 0 ? (d.v100 / d.v25 * 100) : null;

    // Efficiency score (composite): lower CPR + higher engagement rate + higher comment rate
    const cprScore = cpr !== null ? Math.min(100, (0.05 / Math.max(cpr, 0.001)) * 100) : 0;
    const engScore = Math.min(100, engRate * 2);
    const commentScore = Math.min(100, commentRate * 5);
    const efficiencyScore = (cprScore * 0.5 + engScore * 0.3 + commentScore * 0.2);

    return {
        name, ...d, cpr, cpe, engRate, commentRate, ctr, ret100, efficiencyScore,
        resultTypeList: [...d.resultTypes].join(', ')
    };
}).filter(c => c.spend > 0).sort((a, b) => b.spend - a.spend);

// === COMPUTE RANKINGS ===
const byEfficiency = [...creativeAnalysis].sort((a, b) => b.efficiencyScore - a.efficiencyScore);
const byCPR = [...creativeAnalysis].filter(c => c.cpr !== null && c.cpr > 0).sort((a, b) => a.cpr - b.cpr);
const byEngagement = [...creativeAnalysis].sort((a, b) => b.engagements - a.engagements);
const byComments = [...creativeAnalysis].sort((a, b) => b.comments - a.comments);
const byEngRate = [...creativeAnalysis].filter(c => c.reach > 5000).sort((a, b) => b.engRate - a.engRate);

// === CORRELATIONS ===
function pearson(x, y) {
    const n = x.length; if (n < 3) return 0;
    const mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
    let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < n; i++) { num += (x[i] - mx) * (y[i] - my); dx += (x[i] - mx) ** 2; dy += (y[i] - my) ** 2; }
    return dx === 0 || dy === 0 ? 0 : Math.round(num / Math.sqrt(dx * dy) * 10000) / 10000;
}

const validRows = rows.filter(r => num(r['Amount spent (USD)']) > 0);
const correlations = [
    { a: 'Reach', b: 'Results', r: pearson(validRows.map(r => num(r.Reach)), validRows.map(r => num(r.Results))) },
    { a: 'Spend', b: 'Results', r: pearson(validRows.map(r => num(r['Amount spent (USD)'])), validRows.map(r => num(r.Results))) },
    { a: 'Impressions', b: 'Comments', r: pearson(validRows.map(r => num(r.Impressions)), validRows.map(r => num(r['Post comments']))) },
    { a: 'Frequency', b: 'Results', r: pearson(validRows.map(r => num(r.Frequency)), validRows.map(r => num(r.Results))) },
    { a: 'Spend', b: 'CTR', r: pearson(validRows.map(r => num(r['Amount spent (USD)'])), validRows.map(r => num(r['CTR (all)']))) },
    { a: 'Engagements', b: 'Results', r: pearson(validRows.map(r => num(r['Post engagements'])), validRows.map(r => num(r.Results))) },
    { a: 'Comments', b: 'Results', r: pearson(validRows.map(r => num(r['Post comments'])), validRows.map(r => num(r.Results))) },
    { a: 'Reach', b: 'Engagements', r: pearson(validRows.map(r => num(r.Reach)), validRows.map(r => num(r['Post engagements']))) },
];

// === VIDEO RETENTION ===
const totalV25 = creativeAnalysis.reduce((s, c) => s + c.v25, 0);
const totalV50 = creativeAnalysis.reduce((s, c) => s + c.v50, 0);
const totalV75 = creativeAnalysis.reduce((s, c) => s + c.v75, 0);
const totalV95 = creativeAnalysis.reduce((s, c) => s + c.v95, 0);
const totalV100 = creativeAnalysis.reduce((s, c) => s + c.v100, 0);

// === FREQUENCY ANALYSIS ===
const freqBuckets = [
    { label: '1.0-1.5x', min: 0, max: 1.5 },
    { label: '1.5-2.5x', min: 1.5, max: 2.5 },
    { label: '2.5-4.0x', min: 2.5, max: 4.0 },
    { label: '4.0x+', min: 4.0, max: 999 }
];
const freqData = freqBuckets.map(b => {
    const matching = validRows.filter(r => { const f = num(r.Frequency); return f >= b.min && f < b.max; });
    return {
        label: b.label,
        spend: matching.reduce((s, r) => s + num(r['Amount spent (USD)']), 0),
        results: matching.reduce((s, r) => s + num(r.Results), 0),
        rows: matching.length
    };
});

// === WASTE ANALYSIS ===
const zeroResultRows = validRows.filter(r => num(r.Results) === 0);
const wasteSpend = zeroResultRows.reduce((s, r) => s + num(r['Amount spent (USD)']), 0);
const totalSpend = validRows.reduce((s, r) => s + num(r['Amount spent (USD)']), 0);

// === ENGAGEMENT QUALITY INDEX ===
const eqi = creativeAnalysis.map(c => ({
    name: c.name,
    spend: c.spend,
    comments: c.comments,
    engagements: c.engagements,
    reach: c.reach,
    commentPerDollar: c.spend > 0 ? c.comments / c.spend : 0,
    engPerDollar: c.spend > 0 ? c.engagements / c.spend : 0,
    engRate: c.engRate,
    commentRate: c.commentRate
})).filter(e => e.spend > 5).sort((a, b) => b.commentPerDollar - a.commentPerDollar);

// === SAVE ALL ANALYSIS ===
const analysis = {
    metadata: { client: 'KSA Home', handle: '@ksaconstructor.ve', period: 'Marzo 2023 – Marzo 2026', totalRows: rows.length, totalCreatives: creativeAnalysis.length, generatedAt: new Date().toISOString() },
    global_kpis: {
        total_spend: Math.round(totalSpend * 100) / 100,
        total_reach: validRows.reduce((s, r) => s + num(r.Reach), 0),
        total_impressions: validRows.reduce((s, r) => s + num(r.Impressions), 0),
        total_results: validRows.reduce((s, r) => s + num(r.Results), 0),
        total_clicks: validRows.reduce((s, r) => s + num(r['Clicks (all)']), 0),
        total_link_clicks: validRows.reduce((s, r) => s + num(r['Link clicks']), 0),
        total_comments: validRows.reduce((s, r) => s + num(r['Post comments']), 0),
        total_engagements: validRows.reduce((s, r) => s + num(r['Post engagements']), 0),
        total_ig_visits: validRows.reduce((s, r) => s + num(r['Instagram profile visits']), 0),
        total_views: validRows.reduce((s, r) => s + num(r.Views), 0),
    },
    creative_analysis: creativeAnalysis.map(c => ({ name: c.name, spend: Math.round(c.spend * 100) / 100, results: c.results, cpr: c.cpr ? Math.round(c.cpr * 10000) / 10000 : null, reach: c.reach, impressions: c.impressions, clicks: c.clicks, comments: c.comments, engagements: c.engagements, igVisits: c.igVisits, engRate: Math.round(c.engRate * 100) / 100, commentRate: Math.round(c.commentRate * 100) / 100, ctr: Math.round(c.ctr * 100) / 100, cpe: c.cpe ? Math.round(c.cpe * 10000) / 10000 : null, efficiencyScore: Math.round(c.efficiencyScore * 10) / 10, category: c.category, contentType: c.contentType, resultTypes: c.resultTypeList })),
    rankings: {
        by_efficiency: byEfficiency.slice(0, 15).map(c => ({ name: c.name, score: Math.round(c.efficiencyScore * 10) / 10, spend: Math.round(c.spend * 100) / 100, results: c.results, cpr: c.cpr ? Math.round(c.cpr * 10000) / 10000 : null, engRate: Math.round(c.engRate * 100) / 100 })),
        by_cpr: byCPR.slice(0, 15).map(c => ({ name: c.name, cpr: Math.round(c.cpr * 10000) / 10000, spend: Math.round(c.spend * 100) / 100, results: c.results })),
        by_engagement: byEngagement.slice(0, 10).map(c => ({ name: c.name, engagements: c.engagements, spend: Math.round(c.spend * 100) / 100, engRate: Math.round(c.engRate * 100) / 100, comments: c.comments })),
        by_comments: byComments.slice(0, 10).map(c => ({ name: c.name, comments: c.comments, spend: Math.round(c.spend * 100) / 100, commentPerDollar: c.spend > 0 ? Math.round(c.comments / c.spend * 100) / 100 : 0 })),
        by_engagement_rate: byEngRate.slice(0, 10).map(c => ({ name: c.name, engRate: Math.round(c.engRate * 100) / 100, reach: c.reach, engagements: c.engagements, spend: Math.round(c.spend * 100) / 100 })),
    },
    category_analysis: [...categories.entries()].map(([cat, d]) => ({ category: cat, spend: Math.round(d.spend * 100) / 100, results: d.results, cpr: d.results > 0 ? Math.round(d.spend / d.results * 10000) / 10000 : null, reach: d.reach, comments: d.comments, engagements: d.engagements, creatives: d.creatives.size, igVisits: d.igVisits })).sort((a, b) => b.spend - a.spend),
    content_type_analysis: [...contentTypes.entries()].map(([ct, d]) => ({ contentType: ct, spend: Math.round(d.spend * 100) / 100, results: d.results, cpr: d.results > 0 ? Math.round(d.spend / d.results * 10000) / 10000 : null, reach: d.reach, comments: d.comments, engagements: d.engagements, creatives: d.creatives.size })).sort((a, b) => b.spend - a.spend),
    result_types: [...resultTypes.entries()].map(([rt, d]) => ({ type: rt, spend: Math.round(d.spend * 100) / 100, results: d.results, cpr: d.results > 0 ? Math.round(d.spend / d.results * 10000) / 10000 : null, rows: d.rows })).sort((a, b) => b.results - a.results),
    demographics: {
        by_age: [...demographics.byAge.entries()].map(([age, d]) => ({ age, spend: Math.round(d.spend * 100) / 100, results: d.results, cpr: d.results > 0 ? Math.round(d.spend / d.results * 10000) / 10000 : null, reach: d.reach, ctr: d.impressions > 0 ? Math.round(d.clicks / d.impressions * 10000) / 100 : 0, cpc: d.linkClicks > 0 ? Math.round(d.spend / d.linkClicks * 10000) / 10000 : 0, comments: d.comments, retention100: d.v25 > 0 ? Math.round(d.v100 / d.v25 * 1000) / 10 : null })).sort((a, b) => { const order = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+']; return order.indexOf(a.age) - order.indexOf(b.age); }),
        by_gender: [...demographics.byGender.entries()].map(([gender, d]) => ({ gender, spend: Math.round(d.spend * 100) / 100, results: d.results, cpr: d.results > 0 ? Math.round(d.spend / d.results * 10000) / 10000 : null, ctr: d.impressions > 0 ? Math.round(d.clicks / d.impressions * 10000) / 100 : 0, comments: d.comments, avgFreq: d.freqCount > 0 ? Math.round(d.freq / d.freqCount * 100) / 100 : 0 })),
        best_segments: [...demographics.byAgeGender.entries()].map(([key, d]) => { const [age, gender] = key.split('|'); return { age, gender, spend: Math.round(d.spend * 100) / 100, results: d.results, cpr: d.results > 0 ? Math.round(d.spend / d.results * 10000) / 10000 : null }; }).filter(d => d.spend > 3).sort((a, b) => (a.cpr || 999) - (b.cpr || 999)).slice(0, 15),
    },
    video_retention: { total: { v25: totalV25, v50: totalV50, v75: totalV75, v95: totalV95, v100: totalV100 }, rates: { r50: totalV25 > 0 ? Math.round(totalV50 / totalV25 * 1000) / 10 : 0, r75: totalV25 > 0 ? Math.round(totalV75 / totalV25 * 1000) / 10 : 0, r95: totalV25 > 0 ? Math.round(totalV95 / totalV25 * 1000) / 10 : 0, r100: totalV25 > 0 ? Math.round(totalV100 / totalV25 * 1000) / 10 : 0 } },
    correlations: correlations.sort((a, b) => Math.abs(b.r) - Math.abs(a.r)),
    frequency: freqData.map(f => ({ ...f, spend: Math.round(f.spend * 100) / 100, cpr: f.results > 0 ? Math.round(f.spend / f.results * 10000) / 10000 : null })),
    waste: { total_spend: Math.round(totalSpend * 100) / 100, waste_spend: Math.round(wasteSpend * 100) / 100, waste_pct: Math.round(wasteSpend / totalSpend * 1000) / 10, zero_result_rows: zeroResultRows.length },
    engagement_quality: eqi.slice(0, 15).map(e => ({ name: e.name, comments: e.comments, engagements: e.engagements, spend: Math.round(e.spend * 100) / 100, commentPerDollar: Math.round(e.commentPerDollar * 100) / 100, engPerDollar: Math.round(e.engPerDollar * 100) / 100, engRate: Math.round(e.engRate * 100) / 100 })),
};

// Save
const outDir = path.join(__dirname, 'analysis');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
fs.writeFileSync(path.join(outDir, 'deep_creative_analysis.json'), JSON.stringify(analysis, null, 2));
console.log('\n=== DEEP ANALYSIS COMPLETE ===');
console.log(`Creatives analyzed: ${creativeAnalysis.length}`);
console.log(`Categories: ${categories.size}`);
console.log(`Content types: ${contentTypes.size}`);
console.log(`Total spend: $${analysis.global_kpis.total_spend}`);
console.log(`Total results: ${analysis.global_kpis.total_results}`);
console.log(`Waste: ${analysis.waste.waste_pct}%`);
console.log(`\nTop 5 by Efficiency Score:`);
byEfficiency.slice(0, 5).forEach((c, i) => console.log(`  ${i + 1}. [${Math.round(c.efficiencyScore)}] ${c.name.substring(0, 50)} — CPR=$${c.cpr?.toFixed(4) || 'N/A'}, EngRate=${c.engRate.toFixed(1)}%`));
console.log(`\nTop 5 by CPR:`);
byCPR.slice(0, 5).forEach((c, i) => console.log(`  ${i + 1}. CPR=$${c.cpr.toFixed(4)} — ${c.name.substring(0, 50)}`));
console.log(`\nTop 5 by Comments:`);
byComments.slice(0, 5).forEach((c, i) => console.log(`  ${i + 1}. ${c.comments} comments — ${c.name.substring(0, 50)}`));
console.log('\nSaved to analysis/deep_creative_analysis.json');
