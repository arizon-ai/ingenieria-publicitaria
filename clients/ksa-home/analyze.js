const fs = require('fs');
const path = require('path');

// ========== CSV PARSING ==========
const csvPath = path.join(__dirname, 'input', 'arizon.ai-ksa-home-2023-2026.csv');
const csvRaw = fs.readFileSync(csvPath, 'utf-8');

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

const lines = csvRaw.split('\n').filter(l => l.trim());
const headers = parseCSVLine(lines[0]);
const rows = [];
for (let i = 2; i < lines.length; i++) { // skip header + totals row
    const vals = parseCSVLine(lines[i]);
    if (vals.length < 5) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
    rows.push(row);
}

// Helper: parse number safely
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const round = (v, d = 4) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);

// ========== MAPPED DATA ==========
const data = rows.map(r => ({
    ad: r['Ads'] || '',
    campaign: r['Campaign name'] || '',
    gender: (r['Gender'] || 'unknown').toLowerCase(),
    age: r['Age'] || 'Unknown',
    reach: num(r['Reach']),
    impressions: num(r['Impressions']),
    frequency: num(r['Frequency']),
    spend: num(r['Amount spent (USD)']),
    result_type: r['Result type'] || '',
    results: num(r['Results']),
    cost_per_result: num(r['Cost per result']),
    clicks_all: num(r['Clicks (all)']),
    cpc_all: num(r['CPC (all)']),
    cpm: num(r['CPM (cost per 1,000 impressions)']),
    ctr_all: num(r['CTR (all)']),
    cpc_link: num(r['CPC (cost per link click)']),
    link_clicks: num(r['Link clicks']),
    views: num(r['Views']),
    viewers: num(r['Viewers']),
    video_25: num(r['Video plays at 25%']),
    video_50: num(r['Video plays at 50%']),
    video_75: num(r['Video plays at 75%']),
    video_95: num(r['Video plays at 95%']),
    video_100: num(r['Video plays at 100%']),
    comments: num(r['Post comments']),
    engagements: num(r['Post engagements']),
    cost_per_engagement: num(r['Cost per post engagement']),
    ig_profile_visits: num(r['Instagram profile visits']),
    ctr_link: num(r['CTR (link click-through rate)']),
    unique_ctr: num(r['Unique CTR (all)']),
    unique_clicks: num(r['Unique clicks (all)']),
    cost_per_unique_link_click: num(r['Cost per unique link click']),
    cost_per_1000_reached: num(r['Cost per 1,000 Accounts Center accounts reached']),
    report_start: r['Reporting starts'],
    report_end: r['Reporting ends']
}));

console.log(`Parsed ${data.length} data rows`);

// ========== TOTALS ROW (line 2) ==========
const totalsVals = parseCSVLine(lines[1]);
const totalsRow = {};
headers.forEach((h, idx) => { totalsRow[h] = totalsVals[idx] || ''; });

const TOTAL_SPEND = num(totalsRow['Amount spent (USD)']);
const TOTAL_REACH = num(totalsRow['Reach']);
const TOTAL_IMPRESSIONS = num(totalsRow['Impressions']);
const TOTAL_CLICKS = num(totalsRow['Clicks (all)']);
const TOTAL_LINK_CLICKS = num(totalsRow['Link clicks']);
const TOTAL_COMMENTS = num(totalsRow['Post comments']);
const TOTAL_ENGAGEMENTS = num(totalsRow['Post engagements']);
const TOTAL_VIDEO_25 = num(totalsRow['Video plays at 25%']);
const TOTAL_VIDEO_50 = num(totalsRow['Video plays at 50%']);
const TOTAL_VIDEO_75 = num(totalsRow['Video plays at 75%']);
const TOTAL_VIDEO_95 = num(totalsRow['Video plays at 95%']);
const TOTAL_VIDEO_100 = num(totalsRow['Video plays at 100%']);
const TOTAL_VIEWS = num(totalsRow['Views']);
const TOTAL_VIEWERS = num(totalsRow['Viewers']);
const TOTAL_IG_VISITS = num(totalsRow['Instagram profile visits']);
const AVG_FREQ = num(totalsRow['Frequency']);

// Total results (sum from data since multiple result types)
const TOTAL_RESULTS = data.reduce((s, d) => s + d.results, 0);

// ========== RESULT TYPE ANALYSIS ==========
const resultTypeMap = {};
data.forEach(d => {
    const rt = d.result_type || 'Unknown';
    if (!resultTypeMap[rt]) resultTypeMap[rt] = { count: 0, spend: 0, results: 0, reach: 0 };
    resultTypeMap[rt].count += 1;
    resultTypeMap[rt].spend += d.spend;
    resultTypeMap[rt].results += d.results;
    resultTypeMap[rt].reach += d.reach;
});
const resultTypes = Object.entries(resultTypeMap).map(([type, v]) => ({
    type,
    rows: v.count,
    spend: round(v.spend, 2),
    results: v.results,
    cpr: v.results > 0 ? round(v.spend / v.results, 4) : null,
    reach: v.reach
})).sort((a, b) => b.spend - a.spend);

// ========== CAMPAIGN AGGREGATION ==========
const campaignMap = {};
data.forEach(d => {
    const c = d.campaign || 'Unknown';
    if (!campaignMap[c]) campaignMap[c] = { spend: 0, reach: 0, impressions: 0, clicks: 0, link_clicks: 0, results: 0, comments: 0, engagements: 0, ig_visits: 0, rows: 0 };
    campaignMap[c].spend += d.spend;
    campaignMap[c].reach += d.reach;
    campaignMap[c].impressions += d.impressions;
    campaignMap[c].clicks += d.clicks_all;
    campaignMap[c].link_clicks += d.link_clicks;
    campaignMap[c].results += d.results;
    campaignMap[c].comments += d.comments;
    campaignMap[c].engagements += d.engagements;
    campaignMap[c].ig_visits += d.ig_profile_visits;
    campaignMap[c].rows += 1;
});

const campaigns = Object.entries(campaignMap).map(([name, v]) => ({
    campaign: name,
    spend: round(v.spend, 2),
    results: v.results,
    cost_per_result: v.results > 0 ? round(v.spend / v.results, 4) : null,
    efficiency_score: v.results > 0 ? round(v.results / v.spend, 4) : 0,
    reach: v.reach,
    impressions: v.impressions,
    clicks: v.clicks,
    link_clicks: v.link_clicks,
    comments: v.comments,
    engagements: v.engagements,
    ig_visits: v.ig_visits,
    rows: v.rows
})).sort((a, b) => b.spend - a.spend);

// ========== AD / CREATIVE AGGREGATION ==========
const adMap = {};
data.forEach(d => {
    const a = d.ad || 'Unknown';
    if (!adMap[a]) adMap[a] = { spend: 0, reach: 0, impressions: 0, clicks: 0, link_clicks: 0, results: 0, comments: 0, engagements: 0, ig_visits: 0, rows: 0, video_25: 0, video_50: 0, video_75: 0, video_100: 0 };
    adMap[a].spend += d.spend;
    adMap[a].reach += d.reach;
    adMap[a].impressions += d.impressions;
    adMap[a].clicks += d.clicks_all;
    adMap[a].link_clicks += d.link_clicks;
    adMap[a].results += d.results;
    adMap[a].comments += d.comments;
    adMap[a].engagements += d.engagements;
    adMap[a].ig_visits += d.ig_profile_visits;
    adMap[a].rows += 1;
    adMap[a].video_25 += d.video_25;
    adMap[a].video_50 += d.video_50;
    adMap[a].video_75 += d.video_75;
    adMap[a].video_100 += d.video_100;
});

const ads = Object.entries(adMap).map(([name, v]) => ({
    ad: name,
    spend: round(v.spend, 2),
    results: v.results,
    cpr: v.results > 0 ? round(v.spend / v.results, 4) : null,
    reach: v.reach,
    impressions: v.impressions,
    clicks: v.clicks,
    link_clicks: v.link_clicks,
    comments: v.comments,
    engagements: v.engagements,
    ig_visits: v.ig_visits,
    ctr: v.impressions > 0 ? round(v.clicks / v.impressions * 100, 2) : 0,
    video_retention_100: v.video_25 > 0 ? round(v.video_100 / v.video_25 * 100, 1) : null,
    rows: v.rows
})).sort((a, b) => b.spend - a.spend);

// ========== DEMOGRAPHIC ANALYSIS ==========
const ages = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+', 'Unknown'];
const genders = ['female', 'male', 'unknown'];

function buildHeatmap(metric) {
    return ages.map(age => {
        const row = { age };
        genders.forEach(g => {
            const filtered = data.filter(d => d.age === age && d.gender === g);
            row[g] = round(filtered.reduce((s, d) => s + d[metric], 0), 2);
        });
        return row;
    });
}

const heatmap_spend = buildHeatmap('spend');
const heatmap_results = ages.map(age => {
    const row = { age };
    genders.forEach(g => {
        const filtered = data.filter(d => d.age === age && d.gender === g);
        row[g] = filtered.reduce((s, d) => s + d.results, 0);
    });
    return row;
});

// CPR heatmap
const heatmap_cpr = ages.map(age => {
    const row = { age };
    genders.forEach(g => {
        const filtered = data.filter(d => d.age === age && d.gender === g);
        const spend = filtered.reduce((s, d) => s + d.spend, 0);
        const results = filtered.reduce((s, d) => s + d.results, 0);
        row[g] = results > 0 ? round(spend / results, 2) : 0;
    });
    return row;
});

// Age distribution
const age_distribution = ages.map(age => {
    const filtered = data.filter(d => d.age === age);
    const spend = round(filtered.reduce((s, d) => s + d.spend, 0), 2);
    const results = filtered.reduce((s, d) => s + d.results, 0);
    return { age, spend, results, pct_spend: TOTAL_SPEND > 0 ? round(spend / TOTAL_SPEND * 100, 1) : 0 };
});

// Gender distribution
const gender_distribution = genders.map(gender => {
    const filtered = data.filter(d => d.gender === gender);
    const spend = round(filtered.reduce((s, d) => s + d.spend, 0), 2);
    const results = filtered.reduce((s, d) => s + d.results, 0);
    const clicks = filtered.reduce((s, d) => s + d.clicks_all, 0);
    const link_clicks = filtered.reduce((s, d) => s + d.link_clicks, 0);
    const comments = filtered.reduce((s, d) => s + d.comments, 0);
    const avgCtr = filtered.length > 0 ? filtered.reduce((s, d) => s + d.ctr_all, 0) / filtered.length : 0;
    return {
        gender,
        spend,
        results,
        cpr: results > 0 ? round(spend / results, 4) : 0,
        ctr: round(avgCtr, 4),
        comments,
        link_clicks,
        pct_spend: TOTAL_SPEND > 0 ? round(spend / TOTAL_SPEND * 100, 1) : 0
    };
});

// Best demographics by CPR
const best_demographics = [];
ages.forEach(age => {
    genders.forEach(gender => {
        const filtered = data.filter(d => d.age === age && d.gender === gender);
        const spend = filtered.reduce((s, d) => s + d.spend, 0);
        const results = filtered.reduce((s, d) => s + d.results, 0);
        if (results > 0 && spend > 1) {
            best_demographics.push({ age, gender, cost_per_result: round(spend / results, 4), results, spend: round(spend, 2) });
        }
    });
});
best_demographics.sort((a, b) => a.cost_per_result - b.cost_per_result);

// ========== PRODUCT/CATEGORY EXTRACTION ==========
const productKeywordsAds = {
    'Cerámicas/Porcelanato': ['cerámica', 'ceramica', 'porcelanato', 'PORCELANATO', 'CERAMICAS', 'baño merece', 'lujo que tu baño'],
    'Pinturas': ['pintar', 'pinturas', 'Ahorrar y pintar'],
    'Ofertas/Promociones': ['OFERTAS', 'PRECIOS DE LOCURA', '4 DÍAS', 'PRECIOS INSUPERABLES', 'Semana de ofertas', 'SEMANA DE OFERTAS', 'AHORRA EN GRANDE', 'AHORRA EN TU', 'Alerta de Oferta', 'GREEN WEEK'],
    'Drywall': ['drywall', 'DRYWALL'],
    'Grifería/Faucet': ['MA Faucet', 'MA PLUS', 'cada producto MA', 'Faucet'],
    'Tanques': ['tanques', 'tanque', 'Cansado de tanques'],
    'Eléctricos/Conexiones': ['conexión', 'conexiones', 'cada conexión'],
    'Construcción General': ['proyecto de', 'Planeando tu', 'CONSTRUCTORES', 'constructor'],
    'Navidad/Temporal': ['Navidad', 'Dale vida a tu Navidad'],
    'Brand/Lifestyle': ['POV:', 'Nos encanta', 'Encontraste', 'Caterina', 'El Jaque Mate', 'Para cerrar nuestro', '@ksaconstructor', 'Te damos más', 'Celebra con nosotros', 'Así es! Si estabas', 'Que la lluvia', 'En cada producto', 'Instagram Post', 'Atención,'],
    'Tráfico/Leads': ['Nueva campaña de Tráfico', 'CAMPAÑA MOT', 'Tráfico'],
    'Día del Padre': ['día del padre', 'REEL PAPA'],
    'Llamadas': ['PRECIOS INSUPERABLES', 'Estimated call']
};

function getProductCategory(adName, campaignName) {
    const combined = (adName + ' ' + campaignName);
    for (const [product, keywords] of Object.entries(productKeywordsAds)) {
        if (keywords.some(kw => combined.includes(kw))) return product;
    }
    return 'Otros';
}

const productMap = {};
data.forEach(d => {
    const product = getProductCategory(d.ad, d.campaign);
    if (!productMap[product]) productMap[product] = { spend: 0, results: 0, campaigns: new Set(), reach: 0, impressions: 0, rows: 0, engagements: 0, ig_visits: 0 };
    productMap[product].spend += d.spend;
    productMap[product].results += d.results;
    productMap[product].campaigns.add(d.campaign);
    productMap[product].reach += d.reach;
    productMap[product].impressions += d.impressions;
    productMap[product].rows += 1;
    productMap[product].engagements += d.engagements;
    productMap[product].ig_visits += d.ig_profile_visits;
});

const productPerformance = Object.entries(productMap).map(([product, v]) => ({
    product,
    spend: round(v.spend, 2),
    results: v.results,
    cpr: v.results > 0 ? round(v.spend / v.results, 4) : null,
    campaigns: v.campaigns.size,
    reach: v.reach,
    impressions: v.impressions,
    engagements: v.engagements,
    ig_visits: v.ig_visits
})).sort((a, b) => b.spend - a.spend);

// ========== BUDGET WASTE ==========
const rowsWithoutResults = data.filter(d => d.results === 0 && d.spend > 0);
const wastedSpend = round(rowsWithoutResults.reduce((s, d) => s + d.spend, 0), 2);

// ========== AD FATIGUE ==========
const fatigueBuckets = [
    { bucket: '1-1.5x', min: 1, max: 1.5 },
    { bucket: '1.5-2.5x', min: 1.5, max: 2.5 },
    { bucket: '2.5-4x', min: 2.5, max: 4 },
    { bucket: '4x+', min: 4, max: 100 }
];
const adFatigue = fatigueBuckets.map(b => {
    const filtered = data.filter(d => d.frequency >= b.min && d.frequency < b.max);
    const totalCtr = filtered.reduce((s, d) => s + d.ctr_all, 0);
    const spend = filtered.reduce((s, d) => s + d.spend, 0);
    const results = filtered.reduce((s, d) => s + d.results, 0);
    return {
        bucket: b.bucket,
        ctr: filtered.length > 0 ? round(totalCtr / filtered.length, 4) : 0,
        spend: round(spend, 2),
        results
    };
});

// ========== QUALITY RANKING ==========
const campaignQuality = campaigns.map(c => {
    const campData = data.filter(d => d.campaign === c.campaign);
    const avgCtr = campData.length > 0 ? campData.reduce((s, d) => s + d.ctr_all, 0) / campData.length : 0;
    const avgFreq = campData.length > 0 ? campData.reduce((s, d) => s + d.frequency, 0) / campData.length : 0;
    return {
        campaign: c.campaign,
        quality_score: round(avgCtr / (avgFreq || 1), 1),
        spend: c.spend,
        results: c.results
    };
}).sort((a, b) => b.quality_score - a.quality_score);

// ========== CORRELATION FUNCTION ==========
function calcCorrelation(data, keyA, keyB) {
    const n = data.length;
    const a = data.map(d => d[keyA]);
    const b = data.map(d => d[keyB]);
    const meanA = a.reduce((s, v) => s + v, 0) / n;
    const meanB = b.reduce((s, v) => s + v, 0) / n;
    let numerator = 0, denomA = 0, denomB = 0;
    for (let i = 0; i < n; i++) {
        const da = a[i] - meanA;
        const db = b[i] - meanB;
        numerator += da * db;
        denomA += da * da;
        denomB += db * db;
    }
    const denom = Math.sqrt(denomA * denomB);
    return denom === 0 ? 0 : round(numerator / denom, 4);
}

// ========== ANALYSIS_RESULTS.JSON ==========
const uniqueCampaigns = [...new Set(data.map(d => d.campaign))];
const uniqueAds = [...new Set(data.map(d => d.ad))];

const analysisResults = {
    metadata: {
        client: 'ksa-home',
        client_name: 'KSA Home (@ksaconstructor.ve)',
        report_period: '2023-03-01 to 2026-03-02',
        generated_at: new Date().toISOString(),
        total_rows: data.length,
        total_columns: headers.length,
        columns_found: headers,
        note: 'No conversation data - Ari was not installed during this period'
    },
    global_kpis: {
        total_spend: round(TOTAL_SPEND, 2),
        total_reach: TOTAL_REACH,
        total_impressions: TOTAL_IMPRESSIONS,
        total_results: TOTAL_RESULTS,
        total_clicks: TOTAL_CLICKS,
        total_link_clicks: TOTAL_LINK_CLICKS,
        total_comments: TOTAL_COMMENTS,
        total_engagements: TOTAL_ENGAGEMENTS,
        total_views: TOTAL_VIEWS,
        total_viewers: TOTAL_VIEWERS,
        total_ig_profile_visits: TOTAL_IG_VISITS,
        cost_per_result: TOTAL_RESULTS > 0 ? round(TOTAL_SPEND / TOTAL_RESULTS, 4) : 0,
        avg_cpm: TOTAL_IMPRESSIONS > 0 ? round(TOTAL_SPEND / TOTAL_IMPRESSIONS * 1000, 4) : 0,
        avg_cpc: TOTAL_CLICKS > 0 ? round(TOTAL_SPEND / TOTAL_CLICKS, 4) : 0,
        avg_ctr: TOTAL_IMPRESSIONS > 0 ? round(TOTAL_CLICKS / TOTAL_IMPRESSIONS * 100, 4) : 0,
        avg_frequency: round(AVG_FREQ, 2),
        unique_campaigns: uniqueCampaigns.length,
        unique_ads: uniqueAds.length,
        total_rows: data.length
    },
    result_types: resultTypes,
    campaign_performance: {
        top_campaigns: campaigns.slice(0, 15),
        most_efficient: [...campaigns].filter(c => c.results > 0).sort((a, b) => a.cost_per_result - b.cost_per_result).slice(0, 10),
        pareto: (() => {
            let cumSpend = 0;
            let cumResults = 0;
            return {
                campaigns_for_80pct_spend: campaigns.filter(c => { cumSpend += c.spend; return cumSpend / TOTAL_SPEND <= 0.8; }).length + 1,
                data: campaigns.map(c => {
                    cumResults += c.results;
                    return {
                        campaign: c.campaign,
                        spend: c.spend,
                        spend_cumulative_pct: round(campaigns.slice(0, campaigns.indexOf(c) + 1).reduce((s, cc) => s + cc.spend, 0) / TOTAL_SPEND * 100, 1),
                        results: c.results,
                        results_cumulative_pct: TOTAL_RESULTS > 0 ? round(cumResults / TOTAL_RESULTS * 100, 1) : 0
                    };
                })
            };
        })(),
        all_campaigns: campaigns.map(c => ({
            campaign: c.campaign,
            spend: c.spend,
            results: c.results,
            cpr: c.cost_per_result
        }))
    },
    ad_creative_performance: {
        top_ads: ads.slice(0, 15),
        most_efficient: [...ads].filter(a => a.results > 0).sort((a, b) => a.cpr - b.cpr).slice(0, 10),
        total_unique_ads: uniqueAds.length
    },
    demographic_analysis: {
        heatmap_spend,
        heatmap_results,
        heatmap_cpr,
        age_distribution,
        gender_distribution,
        best_demographics: best_demographics.slice(0, 15)
    }
};

// ========== ADVANCED_ANALYSIS.JSON ==========
const advancedAnalysis = {
    product_performance: productPerformance,
    budget_waste: {
        total_spend: TOTAL_SPEND,
        wasted_spend: wastedSpend,
        waste_percentage: TOTAL_SPEND > 0 ? round(wastedSpend / TOTAL_SPEND * 100, 1) : 0,
        rows_without_results: rowsWithoutResults.length,
        total_rows: data.length,
        by_campaign: campaigns.filter(c => c.results === 0).map(c => ({
            campaign: c.campaign,
            spend: c.spend
        })),
        by_product: productPerformance.filter(p => p.results === 0).map(p => ({
            product: p.product,
            spend: p.spend
        }))
    },
    ad_fatigue: { by_saturation: adFatigue },
    quality_ranking: {
        top_quality: campaignQuality.slice(0, 5),
        worst_quality: campaignQuality.slice(-5).reverse()
    }
};

// ========== DEEP_ANALYSIS.JSON ==========
const deepAnalysis = {
    video_retention: {
        totals: {
            video_25: TOTAL_VIDEO_25,
            video_50: TOTAL_VIDEO_50,
            video_75: TOTAL_VIDEO_75,
            video_95: TOTAL_VIDEO_95,
            video_100: TOTAL_VIDEO_100
        },
        retention_rates: {
            video_25: 100.0,
            video_50: TOTAL_VIDEO_25 > 0 ? round(TOTAL_VIDEO_50 / TOTAL_VIDEO_25 * 100, 1) : 0,
            video_75: TOTAL_VIDEO_25 > 0 ? round(TOTAL_VIDEO_75 / TOTAL_VIDEO_25 * 100, 1) : 0,
            video_95: TOTAL_VIDEO_25 > 0 ? round(TOTAL_VIDEO_95 / TOTAL_VIDEO_25 * 100, 1) : 0,
            video_100: TOTAL_VIDEO_25 > 0 ? round(TOTAL_VIDEO_100 / TOTAL_VIDEO_25 * 100, 1) : 0
        },
        by_age: ages.map(age => {
            const filtered = data.filter(d => d.age === age);
            const v25 = filtered.reduce((s, d) => s + d.video_25, 0);
            const v100 = filtered.reduce((s, d) => s + d.video_100, 0);
            return { age, retention_100: v25 > 0 ? round(v100 / v25 * 100, 1) : null };
        })
    },
    frequency_optimization: {
        avg_frequency: round(AVG_FREQ, 2),
        by_bucket: fatigueBuckets.map(b => {
            const filtered = data.filter(d => d.frequency >= b.min && d.frequency < b.max);
            const spend = filtered.reduce((s, d) => s + d.spend, 0);
            const results = filtered.reduce((s, d) => s + d.results, 0);
            return {
                bucket: b.bucket,
                spend: round(spend, 2),
                results,
                cpr: results > 0 ? round(spend / results, 2) : null,
                rows: filtered.length
            };
        })
    },
    engagement: {
        total_comments: TOTAL_COMMENTS,
        total_engagements: TOTAL_ENGAGEMENTS,
        total_ig_profile_visits: TOTAL_IG_VISITS,
        avg_engagements_per_row: round(TOTAL_ENGAGEMENTS / data.length, 2),
        top_campaigns_by_engagement: [...campaigns].sort((a, b) => b.engagements - a.engagements).slice(0, 5).map(c => ({
            campaign: c.campaign,
            engagements: c.engagements,
            comments: c.comments,
            ig_visits: c.ig_visits
        }))
    },
    age_performance: ages.map(age => {
        const filtered = data.filter(d => d.age === age);
        const spend = filtered.reduce((s, d) => s + d.spend, 0);
        const results = filtered.reduce((s, d) => s + d.results, 0);
        const impressions = filtered.reduce((s, d) => s + d.impressions, 0);
        const clicks = filtered.reduce((s, d) => s + d.clicks_all, 0);
        const link_clicks = filtered.reduce((s, d) => s + d.link_clicks, 0);
        const comments = filtered.reduce((s, d) => s + d.comments, 0);
        const avgCtr = filtered.length > 0 ? filtered.reduce((s, d) => s + d.ctr_all, 0) / filtered.length : 0;
        return {
            age,
            spend: round(spend, 4),
            results,
            cpr: results > 0 ? round(spend / results, 4) : 0,
            cpm: impressions > 0 ? round(spend / impressions * 1000, 4) : 0,
            cpc: clicks > 0 ? round(spend / clicks, 4) : 0,
            ctr: round(avgCtr, 4),
            comments,
            link_clicks
        };
    }),
    gender_performance: genders.map(gender => {
        const filtered = data.filter(d => d.gender === gender);
        const spend = filtered.reduce((s, d) => s + d.spend, 0);
        const results = filtered.reduce((s, d) => s + d.results, 0);
        const clicks = filtered.reduce((s, d) => s + d.clicks_all, 0);
        const link_clicks = filtered.reduce((s, d) => s + d.link_clicks, 0);
        const comments = filtered.reduce((s, d) => s + d.comments, 0);
        const avgCtr = filtered.length > 0 ? filtered.reduce((s, d) => s + d.ctr_all, 0) / filtered.length : 0;
        const avgFreq = filtered.length > 0 ? filtered.reduce((s, d) => s + d.frequency, 0) / filtered.length : 0;
        return {
            gender,
            spend: round(spend, 4),
            results,
            cpr: results > 0 ? round(spend / results, 4) : 0,
            ctr: round(avgCtr, 4),
            comments,
            link_clicks,
            frequency: round(avgFreq, 4)
        };
    }),
    correlations: [
        { var_a: 'reach', var_b: 'results', pearson_r: calcCorrelation(data, 'reach', 'results') },
        { var_a: 'impressions', var_b: 'comments', pearson_r: calcCorrelation(data, 'impressions', 'comments') },
        { var_a: 'spend', var_b: 'results', pearson_r: calcCorrelation(data, 'spend', 'results') },
        { var_a: 'frequency', var_b: 'results', pearson_r: calcCorrelation(data, 'frequency', 'results') },
        { var_a: 'spend', var_b: 'ctr_all', pearson_r: calcCorrelation(data, 'spend', 'ctr_all') },
        { var_a: 'frequency', var_b: 'ctr_all', pearson_r: calcCorrelation(data, 'frequency', 'ctr_all') }
    ],
    campaign_ranking: {
        top: campaigns.filter(c => c.results > 0).sort((a, b) => (a.cost_per_result || 999) - (b.cost_per_result || 999)).slice(0, 5).map(c => ({
            campaign: c.campaign, spend: c.spend, results: c.results, cpr: c.cost_per_result, efficiency: c.efficiency_score
        })),
        bottom: campaigns.filter(c => c.results > 0).sort((a, b) => (b.cost_per_result || 0) - (a.cost_per_result || 0)).slice(0, 5).map(c => ({
            campaign: c.campaign, spend: c.spend, results: c.results, cpr: c.cost_per_result
        }))
    }
};

// ========== WRITE OUTPUT ==========
const outDir = path.join(__dirname, 'analysis');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'analysis_results.json'), JSON.stringify(analysisResults, null, 2));
fs.writeFileSync(path.join(outDir, 'advanced_analysis.json'), JSON.stringify(advancedAnalysis, null, 2));
fs.writeFileSync(path.join(outDir, 'deep_analysis.json'), JSON.stringify(deepAnalysis, null, 2));

console.log('\n=== KSA HOME ANALYSIS COMPLETE ===');
console.log(`\nGlobal KPIs:`);
console.log(`  Total Spend: $${TOTAL_SPEND}`);
console.log(`  Total Reach: ${TOTAL_REACH.toLocaleString()}`);
console.log(`  Total Impressions: ${TOTAL_IMPRESSIONS.toLocaleString()}`);
console.log(`  Total Results: ${TOTAL_RESULTS}`);
console.log(`  CPR: $${TOTAL_RESULTS > 0 ? round(TOTAL_SPEND / TOTAL_RESULTS, 2) : 'N/A'}`);
console.log(`  CPC: $${TOTAL_CLICKS > 0 ? round(TOTAL_SPEND / TOTAL_CLICKS, 4) : 'N/A'}`);
console.log(`  CPM: $${TOTAL_IMPRESSIONS > 0 ? round(TOTAL_SPEND / TOTAL_IMPRESSIONS * 1000, 2) : 'N/A'}`);
console.log(`  Avg Frequency: ${round(AVG_FREQ, 2)}`);
console.log(`  Unique Campaigns: ${uniqueCampaigns.length}`);
console.log(`  Unique Ads: ${uniqueAds.length}`);
console.log(`\nResult Types:`);
resultTypes.forEach(rt => {
    console.log(`  ${rt.type}: ${rt.results} results | $${rt.spend} spent | CPR: $${rt.cpr || 'N/A'}`);
});
console.log(`\nTop 5 Campaigns by Spend:`);
campaigns.slice(0, 5).forEach(c => {
    console.log(`  ${c.campaign}: $${c.spend} | ${c.results} results | CPR: $${c.cost_per_result || 'N/A'}`);
});
console.log(`\nProduct Performance:`);
productPerformance.forEach(p => {
    console.log(`  ${p.product}: $${p.spend} | ${p.results} results | CPR: $${p.cpr || 'N/A'} | ${p.campaigns} campaigns`);
});
console.log(`\nDemographics (Best CPR):`);
best_demographics.slice(0, 5).forEach(d => {
    console.log(`  ${d.age} ${d.gender}: CPR $${d.cost_per_result} | ${d.results} results | $${d.spend} spent`);
});
console.log(`\nBudget Waste: $${wastedSpend} (${TOTAL_SPEND > 0 ? round(wastedSpend / TOTAL_SPEND * 100, 1) : 0}%)`);
console.log(`\nVideo Retention:`);
console.log(`  25%: ${TOTAL_VIDEO_25}`);
console.log(`  50%: ${TOTAL_VIDEO_50} (${TOTAL_VIDEO_25 > 0 ? round(TOTAL_VIDEO_50 / TOTAL_VIDEO_25 * 100, 1) : 0}%)`);
console.log(`  75%: ${TOTAL_VIDEO_75} (${TOTAL_VIDEO_25 > 0 ? round(TOTAL_VIDEO_75 / TOTAL_VIDEO_25 * 100, 1) : 0}%)`);
console.log(`  100%: ${TOTAL_VIDEO_100} (${TOTAL_VIDEO_25 > 0 ? round(TOTAL_VIDEO_100 / TOTAL_VIDEO_25 * 100, 1) : 0}%)`);
console.log(`\nFiles written to: ${outDir}`);
