const fs = require('fs');
const path = require('path');

// ========== CSV PARSING ==========
const csvPath = path.join(__dirname, 'input', 'Rotec-Jan-17-2025-to-Feb-17-2026.csv');
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
    clicks_all: num(r['Clicks (all)']),
    cpc_all: num(r['CPC (all)']),
    cpm: num(r['CPM (cost per 1,000 impressions)']),
    ctr_all: num(r['CTR (all)']),
    cpc_link: num(r['CPC (cost per link click)']),
    link_clicks: num(r['Link clicks']),
    views: num(r['Views']),
    video_25: num(r['Video plays at 25%']),
    video_50: num(r['Video plays at 50%']),
    video_75: num(r['Video plays at 75%']),
    video_95: num(r['Video plays at 95%']),
    video_100: num(r['Video plays at 100%']),
    comments: num(r['Post comments']),
    engagements: num(r['Post engagements']),
    cost_per_engagement: num(r['Cost per post engagement']),
    messaging_started: num(r['Messaging conversations started']),
    cost_per_messaging: num(r['Cost per messaging conversation started']),
    ctr_link: num(r['CTR (link click-through rate)']),
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
const TOTAL_MESSAGING = num(totalsRow['Messaging conversations started']);
const TOTAL_COMMENTS = num(totalsRow['Post comments']);
const TOTAL_ENGAGEMENTS = num(totalsRow['Post engagements']);
const TOTAL_VIDEO_25 = num(totalsRow['Video plays at 25%']);
const TOTAL_VIDEO_50 = num(totalsRow['Video plays at 50%']);
const TOTAL_VIDEO_75 = num(totalsRow['Video plays at 75%']);
const TOTAL_VIDEO_95 = num(totalsRow['Video plays at 95%']);
const TOTAL_VIDEO_100 = num(totalsRow['Video plays at 100%']);
const AVG_FREQ = num(totalsRow['Frequency']);

// ========== CAMPAIGN AGGREGATION ==========
const campaignMap = {};
data.forEach(d => {
    const c = d.campaign || 'Unknown';
    if (!campaignMap[c]) campaignMap[c] = { spend: 0, reach: 0, impressions: 0, clicks: 0, link_clicks: 0, messaging: 0, comments: 0, engagements: 0, rows: 0 };
    campaignMap[c].spend += d.spend;
    campaignMap[c].reach += d.reach;
    campaignMap[c].impressions += d.impressions;
    campaignMap[c].clicks += d.clicks_all;
    campaignMap[c].link_clicks += d.link_clicks;
    campaignMap[c].messaging += d.messaging_started;
    campaignMap[c].comments += d.comments;
    campaignMap[c].engagements += d.engagements;
    campaignMap[c].rows += 1;
});

const campaigns = Object.entries(campaignMap).map(([name, v]) => ({
    campaign: name,
    spend: round(v.spend, 2),
    results: v.messaging,
    cost_per_result: v.messaging > 0 ? round(v.spend / v.messaging, 4) : null,
    efficiency_score: v.messaging > 0 ? round(v.messaging / v.spend, 4) : 0,
    reach: v.reach,
    impressions: v.impressions,
    clicks: v.clicks,
    link_clicks: v.link_clicks,
    comments: v.comments,
    engagements: v.engagements,
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
const heatmap_messaging = ages.map(age => {
    const row = { age };
    genders.forEach(g => {
        const filtered = data.filter(d => d.age === age && d.gender === g);
        row[g] = filtered.reduce((s, d) => s + d.messaging_started, 0);
    });
    return row;
});

// CPR heatmap
const heatmap_cpr = ages.map(age => {
    const row = { age };
    genders.forEach(g => {
        const filtered = data.filter(d => d.age === age && d.gender === g);
        const spend = filtered.reduce((s, d) => s + d.spend, 0);
        const msgs = filtered.reduce((s, d) => s + d.messaging_started, 0);
        row[g] = msgs > 0 ? round(spend / msgs, 2) : 0;
    });
    return row;
});

// Age distribution
const age_distribution = ages.map(age => {
    const filtered = data.filter(d => d.age === age);
    const spend = round(filtered.reduce((s, d) => s + d.spend, 0), 2);
    const results = filtered.reduce((s, d) => s + d.messaging_started, 0);
    return { age, spend, results, pct_spend: round(spend / TOTAL_SPEND * 100, 1) };
});

// Best demographics by CPR
const best_demographics = [];
ages.forEach(age => {
    genders.forEach(gender => {
        const filtered = data.filter(d => d.age === age && d.gender === gender);
        const spend = filtered.reduce((s, d) => s + d.spend, 0);
        const results = filtered.reduce((s, d) => s + d.messaging_started, 0);
        if (results > 0 && spend > 1) {
            best_demographics.push({ age, gender, cost_per_result: round(spend / results, 4), results, spend: round(spend, 2) });
        }
    });
});
best_demographics.sort((a, b) => a.cost_per_result - b.cost_per_result);

// ========== CONVERSATIONS ANALYSIS ==========
const convPath = path.join(__dirname, 'input', 'cm-rotec.json');
let conversations = [];
let convAnalysis = { total_conversations: 0, has_data: false };

if (fs.existsSync(convPath)) {
    const convRaw = fs.readFileSync(convPath, 'utf-8');
    conversations = JSON.parse(convRaw);

    const totalMessages = conversations.length;
    const sessions = {};
    const humanMessages = [];

    conversations.forEach(c => {
        const sid = c.session_id || 'unknown';
        if (!sessions[sid]) sessions[sid] = [];
        sessions[sid].push(c);
        if (c.message && c.message.type === 'human') {
            humanMessages.push(c.message.content || '');
        }
    });

    const totalSessions = Object.keys(sessions).length;

    // Intent analysis from human messages
    const intentKeywords = {
        precio: ['precio', 'costo', 'cuánto', 'cuanto', 'vale', 'cotiz', 'presupuest'],
        informacion: ['informa', 'catálogo', 'catalogo', 'ficha', 'caracter', 'especificac', 'modelo', 'disponib'],
        compra: ['comprar', 'pedido', 'orden', 'adquirir', 'envío', 'envio', 'despacho', 'pago'],
        ubicacion: ['dirección', 'direccion', 'ubica', 'donde', 'dónde', 'tienda', 'sucursal', 'local'],
        saludo: ['hola', 'buenos', 'buenas', 'saludos', 'buen día', 'buen dia'],
        reclamo: ['reclamo', 'queja', 'problema', 'defecto', 'garantía', 'garantia', 'devoluci'],
        compresor: ['compresor', 'compresores'],
        correa: ['correa', 'correas'],
        regulador: ['regulador', 'reguladores', 'gas'],
        motor: ['motor', 'motores']
    };

    const intentCounts = {};
    Object.keys(intentKeywords).forEach(k => intentCounts[k] = 0);
    intentCounts['general'] = 0;

    humanMessages.forEach(msg => {
        const lower = msg.toLowerCase();
        let matched = false;
        Object.entries(intentKeywords).forEach(([intent, keywords]) => {
            if (keywords.some(kw => lower.includes(kw))) {
                intentCounts[intent]++;
                matched = true;
            }
        });
        if (!matched) intentCounts['general']++;
    });

    const intentAnalysis = Object.entries(intentCounts)
        .map(([intent, count]) => ({ intent, count, pct: round(count / humanMessages.length * 100, 1) }))
        .sort((a, b) => b.count - a.count);

    // Sentiment (simple keyword-based)
    const positiveWords = ['gracias', 'excelente', 'genial', 'perfecto', 'bueno', 'interesante', 'ok', 'bien'];
    const negativeWords = ['malo', 'pésimo', 'terrible', 'caro', 'no sirve', 'no funciona'];

    let positive = 0, negative = 0, neutral = 0;
    humanMessages.forEach(msg => {
        const lower = msg.toLowerCase();
        if (positiveWords.some(w => lower.includes(w))) positive++;
        else if (negativeWords.some(w => lower.includes(w))) negative++;
        else neutral++;
    });

    // Conversion by conversation length
    const sessionLengths = Object.values(sessions).map(msgs => msgs.length);
    const convByLength = [
        { length: '1-2', total: sessionLengths.filter(l => l <= 2).length },
        { length: '3-5', total: sessionLengths.filter(l => l >= 3 && l <= 5).length },
        { length: '6-10', total: sessionLengths.filter(l => l >= 6 && l <= 10).length },
        { length: '10+', total: sessionLengths.filter(l => l > 10).length }
    ];
    const totalConvs = convByLength.reduce((s, c) => s + c.total, 0);
    convByLength.forEach(c => c.rate = round(c.total / totalConvs * 100, 1));

    // Lead funnel
    const sessionsWithPriceQuery = Object.values(sessions).filter(msgs =>
        msgs.some(m => m.message && m.message.type === 'human' &&
            ['precio', 'costo', 'cuánto', 'cuanto', 'cotiz', 'disponib', 'informa', 'catálogo'].some(kw =>
                (m.message.content || '').toLowerCase().includes(kw)
            )
        )
    ).length;

    const sessionsWithBuyIntent = Object.values(sessions).filter(msgs =>
        msgs.some(m => m.message && m.message.type === 'human' &&
            ['comprar', 'pedido', 'envío', 'envio', 'pago', 'adquirir', 'quiero'].some(kw =>
                (m.message.content || '').toLowerCase().includes(kw)
            )
        )
    ).length;

    // Product interest analysis from conversations
    const productKeywords = {
        'Compresores': ['compresor', 'compresores', 'refrigeración', 'nevera'],
        'Correas': ['correa', 'correas', 'lavadora', 'secadora'],
        'Reguladores': ['regulador', 'reguladores', 'gas', 'válvula'],
        'Motores': ['motor', 'motores', 'exprimid'],
        'Capacitores': ['capacitor', 'capacitores', 'condensador'],
        'Extractores': ['extractor', 'extractores', 'aire'],
        'Llaves': ['llave', 'llaves', 'herramienta']
    };

    const productInterest = {};
    Object.keys(productKeywords).forEach(p => productInterest[p] = 0);
    humanMessages.forEach(msg => {
        const lower = msg.toLowerCase();
        Object.entries(productKeywords).forEach(([product, keywords]) => {
            if (keywords.some(kw => lower.includes(kw))) productInterest[product]++;
        });
    });

    convAnalysis = {
        total_conversations: totalMessages,
        has_data: true,
        sample_fields: ['id', 'session_id', 'message'],
        intent_analysis: intentAnalysis,
        sentiment: {
            distribution: { positive, neutral, negative },
            avg_polarity: round((positive - negative) / humanMessages.length, 4)
        },
        conversion_by_length: convByLength,
        total_sessions: totalSessions,
        total_messages: totalMessages,
        product_interest: Object.entries(productInterest)
            .map(([product, count]) => ({ product, count, pct: round(count / humanMessages.length * 100, 1) }))
            .sort((a, b) => b.count - a.count),
        lead_funnel: {
            total_sessions: totalSessions,
            funnel_steps: [
                { step: 'Inicio conversación', count: totalSessions, pct: 100.0 },
                { step: 'Consulta (Info/Precio)', count: sessionsWithPriceQuery, pct: round(sessionsWithPriceQuery / totalSessions * 100, 1) },
                { step: 'Intención de compra', count: sessionsWithBuyIntent, pct: round(sessionsWithBuyIntent / totalSessions * 100, 1) }
            ],
            conversion_rate_complete: round(sessionsWithBuyIntent / totalSessions * 100, 1)
        }
    };
}

// ========== ANALYSIS_RESULTS.JSON ==========
const uniqueCampaigns = [...new Set(data.map(d => d.campaign))];

const analysisResults = {
    metadata: {
        client: 'rotec',
        report_period: '2025-01-17 to 2026-02-17',
        generated_at: new Date().toISOString(),
        total_rows: data.length,
        total_columns: headers.length,
        columns_found: headers
    },
    global_kpis: {
        total_spend: round(TOTAL_SPEND, 2),
        total_reach: TOTAL_REACH,
        total_impressions: TOTAL_IMPRESSIONS,
        total_results: TOTAL_MESSAGING,
        total_clicks: TOTAL_CLICKS,
        total_link_clicks: TOTAL_LINK_CLICKS,
        total_comments: TOTAL_COMMENTS,
        total_engagements: TOTAL_ENGAGEMENTS,
        cost_per_result: TOTAL_MESSAGING > 0 ? round(TOTAL_SPEND / TOTAL_MESSAGING, 4) : 0,
        avg_cpm: round(TOTAL_SPEND / TOTAL_IMPRESSIONS * 1000, 4),
        avg_cpc: round(TOTAL_SPEND / TOTAL_CLICKS, 4),
        avg_ctr: round(TOTAL_CLICKS / TOTAL_IMPRESSIONS * 100, 4),
        avg_frequency: round(AVG_FREQ, 2),
        unique_campaigns: uniqueCampaigns.length,
        total_rows: data.length
    },
    campaign_performance: {
        top_campaigns: campaigns.slice(0, 10),
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
                        results_cumulative_pct: round(cumResults / TOTAL_MESSAGING * 100, 1)
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
    demographic_analysis: {
        heatmap_spend,
        heatmap_results: heatmap_messaging,
        heatmap_cpr,
        age_distribution,
        best_demographics: best_demographics.slice(0, 10)
    },
    clustering: {},
    conversation_analysis: convAnalysis
};

// ========== ADVANCED_ANALYSIS.JSON ==========
// Product extraction from ad names
const productKeywordsAds = {
    'Compresores': ['compresor', 'compresores', 'Comprar bien', 'motor', 'Corazon', 'cobre', '3 razones', 'Reel compresores', 'nevera'],
    'Correas': ['correa', 'Correas'],
    'Reguladores': ['Regulador', 'reguladores'],
    'Llaves': ['Llave', 'llaves', 'Promo Llaves'],
    'Capacitores': ['Capacitor', 'capacitores'],
    'Extractores': ['Extractor'],
    'Distribuidores': ['Atención distribuidores', 'distribuidor'],
    'Branding/Reconocimiento': ['Reconocimiento', 'Bolivar', 'Guarico', 'Apure'],
    'Ventas General': ['Ventas', 'Tráfico'],
    'Visitas al Perfil': ['visitas al perfil', 'Visitas al perfil', 'Página web', 'Cinco señales', 'concurso', 'Concurso', 'corncurso', 'Entrevistas', 'Nuevos productos', 'Nuevas referencias']
};

function getProductCategory(adName, campaignName) {
    const combined = (adName + ' ' + campaignName).toLowerCase();
    for (const [product, keywords] of Object.entries(productKeywordsAds)) {
        if (keywords.some(kw => combined.toLowerCase().includes(kw.toLowerCase()))) return product;
    }
    return 'OTROS';
}

const productMap = {};
data.forEach(d => {
    const product = getProductCategory(d.ad, d.campaign);
    if (!productMap[product]) productMap[product] = { spend: 0, results: 0, campaigns: new Set(), reach: 0, rows: 0 };
    productMap[product].spend += d.spend;
    productMap[product].results += d.messaging_started;
    productMap[product].campaigns.add(d.campaign);
    productMap[product].reach += d.reach;
    productMap[product].rows += 1;
});

const productPerformance = Object.entries(productMap).map(([product, v]) => ({
    product,
    spend: round(v.spend, 2),
    results: v.results,
    cpr: v.results > 0 ? round(v.spend / v.results, 4) : null,
    campaigns: v.campaigns.size,
    reach: v.reach
})).sort((a, b) => b.spend - a.spend);

// Budget waste
const rowsWithoutResults = data.filter(d => d.messaging_started === 0 && d.spend > 0);
const wastedSpend = round(rowsWithoutResults.reduce((s, d) => s + d.spend, 0), 2);

// Ad fatigue by frequency
const fatigueBuckets = [
    { bucket: '1-1.5x', min: 1, max: 1.5 },
    { bucket: '1.5-2.5x', min: 1.5, max: 2.5 },
    { bucket: '2.5-4x', min: 2.5, max: 4 },
    { bucket: '4x+', min: 4, max: 100 }
];
const adFatigue = fatigueBuckets.map(b => {
    const filtered = data.filter(d => d.frequency >= b.min && d.frequency < b.max);
    const totalCtr = filtered.reduce((s, d) => s + d.ctr_all, 0);
    return {
        bucket: b.bucket,
        ctr: filtered.length > 0 ? round(totalCtr / filtered.length, 4) : 0,
        spend: round(filtered.reduce((s, d) => s + d.spend, 0), 2),
        results: filtered.reduce((s, d) => s + d.messaging_started, 0)
    };
});

// Quality ranking
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

const advancedAnalysis = {
    product_performance: productPerformance,
    budget_waste: {
        total_spend: TOTAL_SPEND,
        wasted_spend: wastedSpend,
        waste_percentage: round(wastedSpend / TOTAL_SPEND * 100, 1),
        rows_without_results: rowsWithoutResults.length,
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
    anomaly_detection: { total_anomalies: 0, anomalies: [] },
    quality_ranking: {
        top_quality: campaignQuality.slice(0, 5),
        worst_quality: campaignQuality.slice(-5).reverse()
    },
    campaign_keywords: (() => {
        const words = {};
        campaigns.forEach(c => {
            c.campaign.split(/[\s-]+/).forEach(w => {
                const clean = w.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ]+/g, '').toUpperCase();
                if (clean.length > 2) words[clean] = (words[clean] || 0) + 1;
            });
        });
        return Object.entries(words).map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count).slice(0, 20);
    })()
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
            const results = filtered.reduce((s, d) => s + d.messaging_started, 0);
            return {
                bucket: b.bucket.replace('x', ''),
                spend: round(spend, 2),
                results,
                cpr: results > 0 ? round(spend / results, 2) : null,
                rows: filtered.length
            };
        })
    },
    engagement: {
        total_comments: TOTAL_COMMENTS,
        avg_comments: round(TOTAL_COMMENTS / data.length, 2),
        top_campaigns: campaigns.sort((a, b) => b.comments - a.comments).slice(0, 5).map(c => ({
            campaign: c.campaign,
            comments: c.comments
        }))
    },
    age_performance: ages.map(age => {
        const filtered = data.filter(d => d.age === age);
        const spend = filtered.reduce((s, d) => s + d.spend, 0);
        const results = filtered.reduce((s, d) => s + d.messaging_started, 0);
        const impressions = filtered.reduce((s, d) => s + d.impressions, 0);
        const clicks = filtered.reduce((s, d) => s + d.clicks_all, 0);
        const link_clicks = filtered.reduce((s, d) => s + d.link_clicks, 0);
        const comments = filtered.reduce((s, d) => s + d.comments, 0);
        const avgCtr = filtered.length > 0 ? filtered.reduce((s, d) => s + d.ctr_all, 0) / filtered.length : 0;
        return {
            age,
            spend: round(spend, 4),
            results: results,
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
        const results = filtered.reduce((s, d) => s + d.messaging_started, 0);
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
        { var_a: 'reach', var_b: 'results', pearson_r: calcCorrelation(data, 'reach', 'messaging_started') },
        { var_a: 'impressions', var_b: 'comments', pearson_r: calcCorrelation(data, 'impressions', 'comments') },
        { var_a: 'spend', var_b: 'results', pearson_r: calcCorrelation(data, 'spend', 'messaging_started') },
        { var_a: 'frequency', var_b: 'results', pearson_r: calcCorrelation(data, 'frequency', 'messaging_started') },
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

// ========== WRITE OUTPUT ==========
const outDir = path.join(__dirname, 'analysis');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'analysis_results.json'), JSON.stringify(analysisResults, null, 2));
fs.writeFileSync(path.join(outDir, 'advanced_analysis.json'), JSON.stringify(advancedAnalysis, null, 2));
fs.writeFileSync(path.join(outDir, 'deep_analysis.json'), JSON.stringify(deepAnalysis, null, 2));

console.log('\n=== ROTEC ANALYSIS COMPLETE ===');
console.log(`\nGlobal KPIs:`);
console.log(`  Total Spend: $${TOTAL_SPEND}`);
console.log(`  Total Reach: ${TOTAL_REACH.toLocaleString()}`);
console.log(`  Total Impressions: ${TOTAL_IMPRESSIONS.toLocaleString()}`);
console.log(`  Total Messaging Started: ${TOTAL_MESSAGING}`);
console.log(`  CPR: $${round(TOTAL_SPEND / TOTAL_MESSAGING, 2)}`);
console.log(`  CPM: $${round(TOTAL_SPEND / TOTAL_IMPRESSIONS * 1000, 2)}`);
console.log(`  Avg Frequency: ${round(AVG_FREQ, 2)}`);
console.log(`  Unique Campaigns: ${uniqueCampaigns.length}`);
console.log(`\nConversations:`);
console.log(`  Total Messages: ${convAnalysis.total_messages || 0}`);
console.log(`  Total Sessions: ${convAnalysis.total_sessions || 0}`);
console.log(`\nTop 5 Campaigns by Spend:`);
campaigns.slice(0, 5).forEach(c => {
    console.log(`  ${c.campaign}: $${c.spend} | ${c.results} results | CPR: $${c.cost_per_result || 'N/A'}`);
});
console.log(`\nProduct Performance:`);
productPerformance.forEach(p => {
    console.log(`  ${p.product}: $${p.spend} | ${p.results} results | CPR: $${p.cpr || 'N/A'}`);
});
console.log(`\nBudget Waste: $${wastedSpend} (${round(wastedSpend / TOTAL_SPEND * 100, 1)}%)`);
console.log(`\nFiles written to: ${outDir}`);
