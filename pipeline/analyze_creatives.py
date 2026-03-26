"""
Ad Creative-Level Analysis for Romo Venezuela
Aggregates performance by ad creative, categorizes by type, and ranks.
"""
import pandas as pd
import json
import sys
import re

def categorize_creative(ad_name):
    """Categorize ad creative by type based on naming patterns."""
    ad = str(ad_name).lower()
    
    # Channel/Objective
    if 'mensajes dm' in ad or 'a3 -' in ad or 'a2 -' in ad or 'a4 -' in ad:
        objective = 'Mensajes DM'
    elif 'ventas mjs ig' in ad or 'ventas mjs ig' in ad:
        objective = 'Ventas Mensajes IG'
    elif 'ventas mjs wa' in ad or 'ventas mjs wa' in ad:
        objective = 'Ventas Mensajes WA'
    elif 'seguidores ig' in ad:
        objective = 'Seguidores IG'
    elif 'farmacias' in ad or 'mjes farmacias' in ad:
        objective = 'Mensajes Farmacias'
    elif 'publicación de instagram' in ad:
        objective = 'Post Orgánico Boosted'
    else:
        objective = 'Otro'
    
    # Format type
    if 'vid' in ad or 'video' in ad:
        format_type = 'Video'
    elif 'img' in ad or 'imagen' in ad:
        format_type = 'Imagen'
    elif 'carrus' in ad:
        format_type = 'Carrusel'
    elif 'publicación' in ad:
        format_type = 'Post'
    else:
        format_type = 'Otro'
    
    # Content type
    if 'jessica' in ad:
        content = 'Testimonio Jessica'
    elif 'rafael' in ad:
        content = 'Testimonio Rafael'
    elif 'gaby' in ad:
        content = 'Testimonio Gaby'
    elif 'dr bioblas' in ad or 'dr educacional' in ad:
        content = 'Dr. Bioblas/Educacional'
    elif 'producto' in ad or 'prod' in ad or 'benef prod' in ad:
        content = 'Producto'
    elif 'pareja' in ad:
        content = 'Testimonio Pareja'
    elif 'hillary' in ad:
        content = 'Testimonio Hillary'
    elif 'janice' in ad:
        content = 'Testimonio Janice'
    elif 'franklin' in ad:
        content = 'Testimonio Franklin'
    elif 'publicación' in ad:
        content = 'Post Orgánico'
    else:
        content = 'Otro'
    
    return objective, format_type, content

def main():
    df = pd.read_csv('clients/romo/input/campaigns.csv')
    
    # Column mapping
    col_map = {
        'Ads': 'ad_name',
        'Amount spent (USD)': 'spend',
        'Reach': 'reach',
        'Impressions': 'impressions',
        'Frequency': 'frequency',
        'Link clicks': 'link_clicks',
        'Clicks (all)': 'clicks_all',
        'CTR (all)': 'ctr_all',
        'Video plays at 25%': 'video_25',
        'Video plays at 50%': 'video_50',
        'Video plays at 75%': 'video_75',
        'Video plays at 95%': 'video_95',
        'Video plays at 100%': 'video_100',
        'Post comments': 'comments',
        'Messaging conversations started': 'conversations',
        'Cost per messaging conversation started': 'cost_per_conv',
        'CPM (cost per 1,000 impressions)': 'cpm',
        'Views': 'views',
    }
    
    for old, new in col_map.items():
        if old in df.columns:
            df.rename(columns={old: new}, inplace=True)
    
    # Ensure numeric
    for c in ['spend','reach','impressions','link_clicks','clicks_all','conversations',
              'video_25','video_50','video_75','video_100','comments','views','frequency']:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors='coerce').fillna(0)
    
    # Group by ad_name
    agg = df.groupby('ad_name').agg(
        spend=('spend','sum'),
        reach=('reach','sum'),
        impressions=('impressions','sum'),
        link_clicks=('link_clicks','sum'),
        clicks_all=('clicks_all','sum'),
        conversations=('conversations','sum'),
        video_25=('video_25','sum'),
        video_50=('video_50','sum'),
        video_75=('video_75','sum'),
        video_100=('video_100','sum'),
        comments=('comments','sum'),
        views=('views','sum'),
        rows=('spend','count'),
    ).reset_index()
    
    # Calculate derived metrics
    agg['cpr'] = (agg['spend'] / agg['conversations']).where(agg['conversations'] > 0, None)
    agg['cpc'] = (agg['spend'] / agg['clicks_all']).where(agg['clicks_all'] > 0, None)
    agg['cpm'] = (agg['spend'] / agg['impressions'] * 1000).where(agg['impressions'] > 0, None)
    agg['ctr'] = (agg['clicks_all'] / agg['impressions'] * 100).where(agg['impressions'] > 0, None)
    agg['video_retention'] = (agg['video_100'] / agg['video_25'] * 100).where(agg['video_25'] > 0, None)
    
    # Categorize
    cats = agg['ad_name'].apply(lambda x: categorize_creative(x))
    agg['objective'] = cats.apply(lambda x: x[0])
    agg['format'] = cats.apply(lambda x: x[1])
    agg['content_type'] = cats.apply(lambda x: x[2])
    
    # Sort by spend descending
    agg = agg.sort_values('spend', ascending=False)
    
    # --- REPORT ---
    total_spend = agg['spend'].sum()
    total_convs = agg['conversations'].sum()
    total_clicks = agg['clicks_all'].sum()
    total_impressions = agg['impressions'].sum()
    
    print(f"\n{'='*80}")
    print(f"ANÁLISIS DE CREATIVOS PUBLICITARIOS - ROMO VENEZUELA")
    print(f"Período: 7 enero – 7 febrero 2026")
    print(f"{'='*80}")
    print(f"\nTotal creativos únicos: {len(agg)}")
    print(f"Inversión total: ${total_spend:.2f}")
    print(f"Conversaciones totales: {int(total_convs)}")
    print(f"Clics totales: {int(total_clicks)}")
    
    # TOP 15 by spend
    print(f"\n{'='*80}")
    print(f"TOP 15 CREATIVOS POR INVERSIÓN")
    print(f"{'='*80}")
    print(f"{'Creativo':<60} {'Spend':>8} {'Conv':>6} {'CPR':>8} {'CTR':>7} {'%Spend':>7}")
    print(f"{'-'*60} {'-'*8} {'-'*6} {'-'*8} {'-'*7} {'-'*7}")
    for _, r in agg.head(15).iterrows():
        name = r['ad_name'][:58]
        cpr_str = f"${r['cpr']:.2f}" if pd.notna(r['cpr']) else "N/A"
        ctr_str = f"{r['ctr']:.2f}%" if pd.notna(r['ctr']) else "N/A"
        pct = r['spend']/total_spend*100
        print(f"{name:<60} ${r['spend']:>6.2f} {int(r['conversations']):>6} {cpr_str:>8} {ctr_str:>7} {pct:>5.1f}%")
    
    # TOP by CPR (most efficient, min 5 conversations)
    eff = agg[agg['conversations'] >= 5].sort_values('cpr', ascending=True)
    print(f"\n{'='*80}")
    print(f"TOP 10 CREATIVOS MÁS EFICIENTES (CPR más bajo, mín. 5 conversaciones)")
    print(f"{'='*80}")
    print(f"{'Creativo':<60} {'CPR':>8} {'Conv':>6} {'Spend':>8} {'CTR':>7}")
    print(f"{'-'*60} {'-'*8} {'-'*6} {'-'*8} {'-'*7}")
    for _, r in eff.head(10).iterrows():
        name = r['ad_name'][:58]
        ctr_str = f"{r['ctr']:.2f}%" if pd.notna(r['ctr']) else "N/A"
        print(f"{name:<60} ${r['cpr']:>6.2f} {int(r['conversations']):>6} ${r['spend']:>6.2f} {ctr_str:>7}")
    
    # WORST by CPR (least efficient, min $1 spend)
    worst = agg[(agg['spend'] >= 1) & (agg['conversations'] > 0)].sort_values('cpr', ascending=False)
    print(f"\n{'='*80}")
    print(f"CREATIVOS MENOS EFICIENTES (CPR más alto, mín. $1 gasto)")
    print(f"{'='*80}")
    print(f"{'Creativo':<60} {'CPR':>8} {'Conv':>6} {'Spend':>8} {'CTR':>7}")
    print(f"{'-'*60} {'-'*8} {'-'*6} {'-'*8} {'-'*7}")
    for _, r in worst.head(10).iterrows():
        name = r['ad_name'][:58]
        ctr_str = f"{r['ctr']:.2f}%" if pd.notna(r['ctr']) else "N/A"
        print(f"{name:<60} ${r['cpr']:>6.2f} {int(r['conversations']):>6} ${r['spend']:>6.2f} {ctr_str:>7}")
    
    # ANALYSIS BY OBJECTIVE
    print(f"\n{'='*80}")
    print(f"RENDIMIENTO POR OBJETIVO")
    print(f"{'='*80}")
    obj_agg = agg.groupby('objective').agg(
        spend=('spend','sum'),
        conversations=('conversations','sum'),
        clicks=('clicks_all','sum'),
        impressions=('impressions','sum'),
        creatives=('ad_name','count'),
    ).reset_index()
    obj_agg['cpr'] = obj_agg['spend'] / obj_agg['conversations'].where(obj_agg['conversations']>0)
    obj_agg['ctr'] = obj_agg['clicks'] / obj_agg['impressions'].where(obj_agg['impressions']>0) * 100
    obj_agg = obj_agg.sort_values('spend', ascending=False)
    print(f"{'Objetivo':<25} {'Creativos':>9} {'Spend':>9} {'Conv':>6} {'CPR':>8} {'CTR':>7} {'%Spend':>7}")
    print(f"{'-'*25} {'-'*9} {'-'*9} {'-'*6} {'-'*8} {'-'*7} {'-'*7}")
    for _, r in obj_agg.iterrows():
        cpr_str = f"${r['cpr']:.2f}" if pd.notna(r['cpr']) else "N/A"
        ctr_str = f"{r['ctr']:.2f}%" if pd.notna(r['ctr']) else "N/A"
        pct = r['spend']/total_spend*100
        print(f"{r['objective']:<25} {r['creatives']:>9} ${r['spend']:>7.2f} {int(r['conversations']):>6} {cpr_str:>8} {ctr_str:>7} {pct:>5.1f}%")
    
    # ANALYSIS BY CONTENT TYPE
    print(f"\n{'='*80}")
    print(f"RENDIMIENTO POR TIPO DE CONTENIDO")
    print(f"{'='*80}")
    ct_agg = agg.groupby('content_type').agg(
        spend=('spend','sum'),
        conversations=('conversations','sum'),
        clicks=('clicks_all','sum'),
        impressions=('impressions','sum'),
        video_25=('video_25','sum'),
        video_100=('video_100','sum'),
        creatives=('ad_name','count'),
    ).reset_index()
    ct_agg['cpr'] = ct_agg['spend'] / ct_agg['conversations'].where(ct_agg['conversations']>0)
    ct_agg['ctr'] = ct_agg['clicks'] / ct_agg['impressions'].where(ct_agg['impressions']>0) * 100
    ct_agg['retention'] = ct_agg['video_100'] / ct_agg['video_25'].where(ct_agg['video_25']>0) * 100
    ct_agg = ct_agg.sort_values('spend', ascending=False)
    print(f"{'Contenido':<25} {'Creativos':>9} {'Spend':>9} {'Conv':>6} {'CPR':>8} {'CTR':>7} {'Ret%':>7}")
    print(f"{'-'*25} {'-'*9} {'-'*9} {'-'*6} {'-'*8} {'-'*7} {'-'*7}")
    for _, r in ct_agg.iterrows():
        cpr_str = f"${r['cpr']:.2f}" if pd.notna(r['cpr']) else "N/A"
        ctr_str = f"{r['ctr']:.2f}%" if pd.notna(r['ctr']) else "N/A"
        ret_str = f"{r['retention']:.1f}%" if pd.notna(r['retention']) else "N/A"
        print(f"{r['content_type']:<25} {r['creatives']:>9} ${r['spend']:>7.2f} {int(r['conversations']):>6} {cpr_str:>8} {ctr_str:>7} {ret_str:>7}")
    
    # ANALYSIS BY FORMAT
    print(f"\n{'='*80}")
    print(f"RENDIMIENTO POR FORMATO")
    print(f"{'='*80}")
    fmt_agg = agg.groupby('format').agg(
        spend=('spend','sum'),
        conversations=('conversations','sum'),
        clicks=('clicks_all','sum'),
        impressions=('impressions','sum'),
        video_25=('video_25','sum'),
        video_100=('video_100','sum'),
        creatives=('ad_name','count'),
    ).reset_index()
    fmt_agg['cpr'] = fmt_agg['spend'] / fmt_agg['conversations'].where(fmt_agg['conversations']>0)
    fmt_agg['ctr'] = fmt_agg['clicks'] / fmt_agg['impressions'].where(fmt_agg['impressions']>0) * 100
    fmt_agg = fmt_agg.sort_values('spend', ascending=False)
    print(f"{'Formato':<15} {'Creativos':>9} {'Spend':>9} {'Conv':>6} {'CPR':>8} {'CTR':>7} {'%Spend':>7}")
    print(f"{'-'*15} {'-'*9} {'-'*9} {'-'*6} {'-'*8} {'-'*7} {'-'*7}")
    for _, r in fmt_agg.iterrows():
        cpr_str = f"${r['cpr']:.2f}" if pd.notna(r['cpr']) else "N/A"
        ctr_str = f"{r['ctr']:.2f}%" if pd.notna(r['ctr']) else "N/A"
        pct = r['spend']/total_spend*100
        print(f"{r['format']:<15} {r['creatives']:>9} ${r['spend']:>7.2f} {int(r['conversations']):>6} {cpr_str:>8} {ctr_str:>7} {pct:>5.1f}%")
    
    # VIDEO RETENTION BY CREATIVE (top spenders)
    vid = agg[(agg['video_25'] > 0) & (agg['spend'] >= 1)].sort_values('spend', ascending=False)
    print(f"\n{'='*80}")
    print(f"RETENCIÓN DE VIDEO POR CREATIVO (Top 15 por gasto)")
    print(f"{'='*80}")
    print(f"{'Creativo':<55} {'25%':>7} {'50%':>7} {'75%':>7} {'100%':>7} {'Ret':>6}")
    print(f"{'-'*55} {'-'*7} {'-'*7} {'-'*7} {'-'*7} {'-'*6}")
    for _, r in vid.head(15).iterrows():
        name = r['ad_name'][:53]
        v25 = int(r['video_25'])
        v50 = int(r['video_50'])
        v75 = int(r['video_75']) if 'video_75' in r else 0
        v100 = int(r['video_100'])
        ret = v100/v25*100 if v25 > 0 else 0
        print(f"{name:<55} {v25:>7,} {v50:>7,} {v75:>7,} {v100:>7,} {ret:>5.1f}%")
    
    # Save JSON for dashboard
    creative_data = {
        'top_creatives': [],
        'by_objective': [],
        'by_content_type': [],
        'by_format': [],
    }
    
    for _, r in agg.head(20).iterrows():
        creative_data['top_creatives'].append({
            'ad_name': r['ad_name'],
            'spend': round(float(r['spend']), 2),
            'conversations': int(r['conversations']),
            'cpr': round(float(r['cpr']), 4) if pd.notna(r['cpr']) else None,
            'clicks': int(r['clicks_all']),
            'ctr': round(float(r['ctr']), 4) if pd.notna(r['ctr']) else None,
            'impressions': int(r['impressions']),
            'cpm': round(float(r['cpm']), 4) if pd.notna(r['cpm']) else None,
            'reach': int(r['reach']),
            'video_retention': round(float(r['video_retention']), 2) if pd.notna(r['video_retention']) else None,
            'comments': int(r['comments']),
            'objective': r['objective'],
            'format': r['format'],
            'content_type': r['content_type'],
        })
    
    for _, r in obj_agg.iterrows():
        creative_data['by_objective'].append({
            'objective': r['objective'],
            'spend': round(float(r['spend']), 2),
            'conversations': int(r['conversations']),
            'cpr': round(float(r['cpr']), 4) if pd.notna(r['cpr']) else None,
            'ctr': round(float(r['ctr']), 4) if pd.notna(r['ctr']) else None,
            'creatives': int(r['creatives']),
        })
    
    for _, r in ct_agg.iterrows():
        creative_data['by_content_type'].append({
            'content_type': r['content_type'],
            'spend': round(float(r['spend']), 2),
            'conversations': int(r['conversations']),
            'cpr': round(float(r['cpr']), 4) if pd.notna(r['cpr']) else None,
            'ctr': round(float(r['ctr']), 4) if pd.notna(r['ctr']) else None,
            'retention': round(float(r['retention']), 2) if pd.notna(r['retention']) else None,
            'creatives': int(r['creatives']),
        })
    
    for _, r in fmt_agg.iterrows():
        creative_data['by_format'].append({
            'format': r['format'],
            'spend': round(float(r['spend']), 2),
            'conversations': int(r['conversations']),
            'cpr': round(float(r['cpr']), 4) if pd.notna(r['cpr']) else None,
            'ctr': round(float(r['ctr']), 4) if pd.notna(r['ctr']) else None,
            'creatives': int(r['creatives']),
        })
    
    outpath = 'clients/romo/analysis/creative_analysis.json'
    with open(outpath, 'w', encoding='utf-8') as f:
        json.dump(creative_data, f, indent=2, ensure_ascii=False)
    print(f"\n\nJSON guardado: {outpath}")
    print(f"{'='*80}")

if __name__ == '__main__':
    main()
