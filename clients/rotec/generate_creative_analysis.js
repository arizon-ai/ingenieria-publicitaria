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
for (let i = 2; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    if (vals.length < 5) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
    rows.push(row);
}

const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const round = (v, d = 4) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);

const data = rows.map(r => ({
    ad: r['Ads'] || '',
    campaign: r['Campaign name'] || '',
    reach: num(r['Reach']),
    impressions: num(r['Impressions']),
    frequency: num(r['Frequency']),
    spend: num(r['Amount spent (USD)']),
    clicks_all: num(r['Clicks (all)']),
    ctr_all: num(r['CTR (all)']),
    cpm: num(r['CPM (cost per 1,000 impressions)']),
    link_clicks: num(r['Link clicks']),
    video_25: num(r['Video plays at 25%']),
    video_50: num(r['Video plays at 50%']),
    video_75: num(r['Video plays at 75%']),
    video_100: num(r['Video plays at 100%']),
    comments: num(r['Post comments']),
    engagements: num(r['Post engagements']),
    messaging_started: num(r['Messaging conversations started']),
}));

// ========== CLASSIFY ADS ==========

// Determine objective from campaign name
function getObjective(campaign) {
    const c = campaign.toLowerCase();
    if (c.includes('ventas') || c.includes('nueva campaña de ventas') || c.includes('nuevo ventas')) return 'Ventas/Mensajes';
    if (c.includes('leads') && c.includes('compresores')) return 'Leads - Compresores';
    if (c.includes('leads') && c.includes('promo llaves')) return 'Leads - Promo Llaves';
    if (c.includes('leads') && c.includes('retargeting')) return 'Leads - Retargeting';
    if (c.includes('tofu') && c.includes('leads')) return 'Leads - TOFU';
    if (c.includes('vendedores') && c.includes('alcance')) return 'Alcance - Vendedores';
    if (c.includes('visitas al perfil')) return 'Visitas al Perfil';
    if (c.includes('reconocimiento')) return 'Reconocimiento';
    if (c.includes('interacción')) return 'Interacción';
    if (c.includes('tráfico')) return 'Tráfico';
    if (c.includes('messages') || c.includes('mensajes')) return 'Mensajes';
    if (c.includes('publicación')) return 'Post Promocionado';
    return 'Otro';
}

// Determine content type from ad name
function getContentType(adName, campaign) {
    const a = (adName + ' ' + campaign).toLowerCase();
    if (a.includes('compresor') || a.includes('compresores') || a.includes('corazon') || a.includes('cobre') || a.includes('3 razones') || a.includes('reel compresores') || a.includes('comprar bien') || a.includes('nevera')) return 'Compresores';
    if (a.includes('correa') || a.includes('correas')) return 'Correas';
    if (a.includes('regulador')) return 'Reguladores';
    if (a.includes('extractor')) return 'Extractores';
    if (a.includes('capacitor') || a.includes('condensador')) return 'Capacitores';
    if (a.includes('llave') || a.includes('promo llaves')) return 'Llaves';
    if (a.includes('motor') || a.includes('exprimid')) return 'Motores';
    if (a.includes('distribuidor') || a.includes('atención distribuidores')) return 'Distribuidores';
    if (a.includes('concurso') || a.includes('corncurso')) return 'Concurso/Promoción';
    if (a.includes('entrevista')) return 'Entrevista/Contenido';
    if (a.includes('nuevos productos') || a.includes('nuevas referencias')) return 'Nuevos Productos';
    if (a.includes('cinco señales') || a.includes('señales')) return 'Contenido Educativo';
    if (a.includes('reconocimiento') || a.includes('bolivar') || a.includes('guarico') || a.includes('apure')) return 'Branding Regional';
    if (a.includes('página web') || a.includes('pagina web')) return 'Tráfico Web';
    return 'General/Producto';
}

// Determine format from ad name
function getFormat(adName) {
    const a = adName.toLowerCase();
    if (a.includes('reel') || a.includes('vid') || a.includes('video')) return 'Video/Reel';
    if (a.includes('carrusel') || a.includes('carousel')) return 'Carrusel';
    if (a.includes('img') || a.includes('imagen') || a.includes('image')) return 'Imagen';
    if (a.includes('publicación')) return 'Post Promocionado';
    // Default: check if has video views
    return 'Video/Reel'; // Most Rotec ads are video content
}

// ========== AGGREGATE BY AD ==========
const adMap = {};
data.forEach(d => {
    const ad = d.ad || 'Unknown';
    if (!adMap[ad]) adMap[ad] = {
        campaign: d.campaign, spend: 0, conversations: 0, clicks: 0, impressions: 0, reach: 0,
        video_25: 0, video_100: 0, comments: 0, engagements: 0, link_clicks: 0, rows: 0, ctrSum: 0
    };
    adMap[ad].spend += d.spend;
    adMap[ad].conversations += d.messaging_started;
    adMap[ad].clicks += d.clicks_all;
    adMap[ad].impressions += d.impressions;
    adMap[ad].reach += d.reach;
    adMap[ad].video_25 += d.video_25;
    adMap[ad].video_100 += d.video_100;
    adMap[ad].comments += d.comments;
    adMap[ad].engagements += d.engagements;
    adMap[ad].link_clicks += d.link_clicks;
    adMap[ad].rows += 1;
    adMap[ad].ctrSum += d.ctr_all;
});

const topCreatives = Object.entries(adMap)
    .map(([ad_name, v]) => ({
        ad_name,
        spend: round(v.spend, 2),
        conversations: v.conversations,
        cpr: v.conversations > 0 ? round(v.spend / v.conversations, 4) : null,
        clicks: v.clicks,
        ctr: round(v.ctrSum / v.rows, 4),
        impressions: v.impressions,
        cpm: v.impressions > 0 ? round(v.spend / v.impressions * 1000, 4) : 0,
        reach: v.reach,
        video_retention: v.video_25 > 0 ? round(v.video_100 / v.video_25 * 100, 2) : null,
        comments: v.comments,
        objective: getObjective(v.campaign),
        format: getFormat(ad_name),
        content_type: getContentType(ad_name, v.campaign)
    }))
    .sort((a, b) => b.spend - a.spend);

// ========== BY OBJECTIVE ==========
const objMap = {};
topCreatives.forEach(c => {
    const obj = c.objective;
    if (!objMap[obj]) objMap[obj] = { spend: 0, conversations: 0, ctrSum: 0, ctrCount: 0, creatives: new Set() };
    objMap[obj].spend += c.spend;
    objMap[obj].conversations += c.conversations;
    objMap[obj].ctrSum += c.ctr;
    objMap[obj].ctrCount += 1;
    objMap[obj].creatives.add(c.ad_name);
});

const byObjective = Object.entries(objMap)
    .map(([objective, v]) => ({
        objective,
        spend: round(v.spend, 2),
        conversations: v.conversations,
        cpr: v.conversations > 0 ? round(v.spend / v.conversations, 4) : null,
        ctr: round(v.ctrSum / v.ctrCount, 4),
        creatives: v.creatives.size
    }))
    .sort((a, b) => b.spend - a.spend);

// ========== BY CONTENT TYPE ==========
const ctMap = {};
topCreatives.forEach(c => {
    const ct = c.content_type;
    if (!ctMap[ct]) ctMap[ct] = { spend: 0, conversations: 0, ctrSum: 0, ctrCount: 0, retSum: 0, retCount: 0, creatives: new Set() };
    ctMap[ct].spend += c.spend;
    ctMap[ct].conversations += c.conversations;
    ctMap[ct].ctrSum += c.ctr;
    ctMap[ct].ctrCount += 1;
    if (c.video_retention !== null) { ctMap[ct].retSum += c.video_retention; ctMap[ct].retCount += 1; }
    ctMap[ct].creatives.add(c.ad_name);
});

const byContentType = Object.entries(ctMap)
    .map(([content_type, v]) => ({
        content_type,
        spend: round(v.spend, 2),
        conversations: v.conversations,
        cpr: v.conversations > 0 ? round(v.spend / v.conversations, 4) : null,
        ctr: round(v.ctrSum / v.ctrCount, 4),
        retention: v.retCount > 0 ? round(v.retSum / v.retCount, 2) : null,
        creatives: v.creatives.size
    }))
    .sort((a, b) => b.spend - a.spend);

// ========== BY FORMAT ==========
const fmtMap = {};
topCreatives.forEach(c => {
    const fmt = c.format;
    if (!fmtMap[fmt]) fmtMap[fmt] = { spend: 0, conversations: 0, ctrSum: 0, ctrCount: 0, creatives: new Set() };
    fmtMap[fmt].spend += c.spend;
    fmtMap[fmt].conversations += c.conversations;
    fmtMap[fmt].ctrSum += c.ctr;
    fmtMap[fmt].ctrCount += 1;
    fmtMap[fmt].creatives.add(c.ad_name);
});

const byFormat = Object.entries(fmtMap)
    .map(([format, v]) => ({
        format,
        spend: round(v.spend, 2),
        conversations: v.conversations,
        cpr: v.conversations > 0 ? round(v.spend / v.conversations, 4) : null,
        ctr: round(v.ctrSum / v.ctrCount, 4),
        creatives: v.creatives.size
    }))
    .sort((a, b) => b.spend - a.spend);

// ========== OUTPUT ==========
const creativeAnalysis = {
    top_creatives: topCreatives,
    by_objective: byObjective,
    by_content_type: byContentType,
    by_format: byFormat
};

const outDir = path.join(__dirname, 'analysis');
fs.writeFileSync(path.join(outDir, 'creative_analysis.json'), JSON.stringify(creativeAnalysis, null, 2));

console.log('=== CREATIVE ANALYSIS GENERATED ===');
console.log(`\nTotal unique ads: ${topCreatives.length}`);
console.log(`\nTop 10 Creatives by Spend:`);
topCreatives.slice(0, 10).forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.ad_name.substring(0, 60)}`);
    console.log(`     $${c.spend} | ${c.conversations} conv | CPR: $${c.cpr || 'N/A'} | ${c.content_type} | ${c.objective}`);
});
console.log(`\nBy Objective:`);
byObjective.forEach(o => {
    console.log(`  ${o.objective}: $${o.spend} | ${o.conversations} conv | CPR: $${o.cpr || 'N/A'} | ${o.creatives} creatives`);
});
console.log(`\nBy Content Type:`);
byContentType.forEach(ct => {
    console.log(`  ${ct.content_type}: $${ct.spend} | ${ct.conversations} conv | CPR: $${ct.cpr || 'N/A'}`);
});
console.log(`\nBy Format:`);
byFormat.forEach(f => {
    console.log(`  ${f.format}: $${f.spend} | ${f.conversations} conv | CPR: $${f.cpr || 'N/A'}`);
});

console.log(`\nFile written to: ${path.join(outDir, 'creative_analysis.json')}`);
