#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
arizon.ai — Unified Marketing Intelligence Analysis Pipeline
=============================================================
Usage:
    python pipeline/analyze.py --client <name>

Reads:  clients/<name>/input/campaigns.csv
        clients/<name>/input/conversations.json  (optional)
Writes: clients/<name>/analysis/analysis_results.json
        clients/<name>/analysis/deep_analysis.json
        clients/<name>/analysis/advanced_analysis.json
"""

import argparse
import json
import os
import re
import sys
import warnings

import numpy as np
import pandas as pd
from scipy import stats

warnings.filterwarnings('ignore')

# ===========================================================================
# CLI
# ===========================================================================
parser = argparse.ArgumentParser(description='arizon.ai Marketing Intelligence Pipeline')
parser.add_argument('--client', required=True, help='Client folder name (e.g. veoyoca)')
args = parser.parse_args()

CLIENT = args.client
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLIENT_DIR = os.path.join(BASE_DIR, 'clients', CLIENT)
INPUT_DIR = os.path.join(CLIENT_DIR, 'input')
OUTPUT_DIR = os.path.join(CLIENT_DIR, 'analysis')

CSV_PATH = os.path.join(INPUT_DIR, 'campaigns.csv')
CSV_PATH = os.path.join(INPUT_DIR, 'campaigns.csv')
JSON_PATH = os.path.join(INPUT_DIR, 'conversations.json')

# Auto-discover JSON if conversations.json doesn't exist
if not os.path.exists(JSON_PATH):
    # Find any .json file in input dir that looks like conversations
    try:
        json_files = [f for f in os.listdir(INPUT_DIR) if f.endswith('.json')]
        if json_files:
            # Pick the largest one or first one
            JSON_PATH = os.path.join(INPUT_DIR, json_files[0])
            print(f"   Auto-detected conversations file: {json_files[0]}")
    except Exception:
        pass

os.makedirs(OUTPUT_DIR, exist_ok=True)

if not os.path.exists(CSV_PATH):
    print(f"ERROR: CSV not found: {CSV_PATH}")
    sys.exit(1)

print("=" * 70)
print(f"arizon.ai — Marketing Intelligence Pipeline")
print(f"Client: {CLIENT}")
print("=" * 70)

# ===========================================================================
# COLUMN MAPPING — handles variable Meta Ads CSV columns
# ===========================================================================
# Meta Ads exports can have different column names depending on language,
# account settings, and report configuration. We map known variants.
COLUMN_ALIASES = {
    'campaign': ['Campaign name', 'Campaign Name', 'Nombre de la campaña', 'campaign_name', 'Account name'],
    'ad_name': ['Ads', 'Ad name', 'Ad Name', 'Nombre del anuncio'],
    'age': ['Age', 'Edad'],
    'gender': ['Gender', 'Género', 'Genero'],
    'status': ['Delivery status', 'Estado de entrega', 'Delivery Status'],
    'delivery_level': ['Delivery level', 'Nivel de entrega'],
    'reach': ['Reach', 'Alcance'],
    'impressions': ['Impressions', 'Impresiones'],
    'frequency': ['Frequency', 'Frecuencia'],
    'results': ['Results', 'Resultados'],
    'result_type': ['Result type', 'Result Type', 'Tipo de resultado'],
    'spend': ['Amount spent (USD)', 'Amount Spent (USD)', 'Importe gastado (USD)',
              'Amount spent', 'Spend', 'Spend (USD)'],
    'cost_per_result': ['Cost per result', 'Cost Per Result', 'Costo por resultado'],
    'ctr_all': ['CTR (all)', 'CTR (todos)', 'CTR (All)'],
    'cpm': ['CPM (cost per 1,000 impressions)', 'CPM', 'CPM (costo por 1.000 impresiones)'],
    'cpc': ['CPC (all)', 'CPC (cost per link click)', 'CPC (todos)',
            'CPC (costo por clic en el enlace)'],
    'link_clicks': ['Link clicks', 'Link Clicks', 'Clics en el enlace'],
    'clicks_all': ['Clicks (all)', 'Clicks (All)', 'Clics (todos)'],
    'video_25': ['Video plays at 25%', 'Reproducciones de video al 25%'],
    'video_50': ['Video plays at 50%', 'Reproducciones de video al 50%'],
    'video_75': ['Video plays at 75%', 'Reproducciones de video al 75%'],
    'video_95': ['Video plays at 95%', 'Reproducciones de video al 95%'],
    'video_100': ['Video plays at 100%', 'Reproducciones de video al 100%'],
    'video_avg_time': ['Video average play time', 'Tiempo de reproducción promedio del video'],
    'comments': ['Post comments', 'Comentarios de la publicación'],
    'unique_clicks': ['Unique clicks (all)', 'Clics únicos (todos)'],
    'unique_ctr': ['Unique CTR (all)', 'CTR único (todos)'],
    'result_rate': ['Result rate', 'Tasa de resultados'],
    'outbound_ctr': ['Outbound CTR (click-through rate)', 'CTR saliente'],
    'ctr_link': ['CTR (link click-through rate)', 'CTR de clics en el enlace'],
    'report_start': ['Reporting starts', 'Inicio del informe'],
    'report_end': ['Reporting ends', 'Fin del informe'],
    'cost_per_messaging': ['Cost per messaging conversation started',
                           'Costo por conversación de mensajería iniciada'],
}


def resolve_columns(df):
    """Map CSV columns to canonical names. Handles variable Meta Ads exports."""
    rename_map = {}
    for canonical, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in df.columns:
                rename_map[alias] = canonical
                break
    df.rename(columns=rename_map, inplace=True)
    return df


def safe_col(df, col):
    """Check if column exists."""
    return col in df.columns


def safe_sum(df, col):
    return int(df[col].sum()) if safe_col(df, col) else 0


def safe_numeric(df, cols):
    """Convert columns to numeric, skipping missing ones."""
    for c in cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors='coerce')


def sanitize_for_json(obj):
    """Recursively replace NaN/Infinity with None for valid JSON."""
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(v) for v in obj]
    elif isinstance(obj, float):
        if obj != obj or obj == float('inf') or obj == float('-inf'):  # NaN or Inf
            return None
        return obj
    elif isinstance(obj, (np.floating,)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, (np.integer,)):
        return int(obj)
    elif isinstance(obj, (np.bool_,)):
        return bool(obj)
    return obj


# ===========================================================================
# LOAD & CLEAN DATA
# ===========================================================================
print("\n[1/3] Loading and cleaning data...")

df = pd.read_csv(CSV_PATH)
df.columns = df.columns.str.strip().str.replace('"', '')
df = resolve_columns(df)

# Fallback for 'campaign' column if missing
if 'campaign' not in df.columns:
    if 'Account name' in df.columns:
        df['campaign'] = df.pop('Account name')
    elif 'account_name' in df.columns:
        df['campaign'] = df.pop('account_name')
    else:
        df['campaign'] = 'Unknown Campaign'

numeric_cols = ['reach', 'impressions', 'frequency', 'results', 'spend',
                'cost_per_result', 'ctr_all', 'cpm', 'cpc', 'link_clicks',
                'video_25', 'video_50', 'video_75', 'video_95', 'video_100',
                'clicks_all', 'comments', 'unique_clicks', 'unique_ctr',
                'result_rate', 'outbound_ctr', 'ctr_link', 'cost_per_messaging']

# Ensure all numeric columns exist, filling with 0 if missing
for c in numeric_cols:
    if c not in df.columns:
        df[c] = 0.0
    df[c] = pd.to_numeric(df[c], errors='coerce').fillna(0)

# Fallback for 'results' if missing or 0
# Many exports don't have a generic "Results" column, but have specific objectives.
# We prioritize: Messaging conversations started > Link clicks > 0
if 'results' not in df.columns or df['results'].sum() == 0:
    if 'Messaging conversations started' in df.columns:
        print("   Using 'Messaging conversations started' as Results")
        df['results'] = df['Messaging conversations started']
    elif 'Link clicks' in df.columns:
        print("   Using 'Link clicks' as Results")
        df['results'] = df['Link clicks']
    elif 'link_clicks' in df.columns:
        df['results'] = df['link_clicks']

# Explicitly ensure key columns are present (redundant safety)
for c in ['results', 'spend', 'reach', 'impressions']:
    if c not in df.columns:
        print(f"WARNING: Column '{c}' missing from CSV. Filling with 0.")
        df[c] = 0.0

print(f"   Loaded: {len(df)} rows, {len(df.columns)} columns")
print(f"   Columns found: {list(df.columns[:10])}...")

# ===========================================================================
# GLOBAL KPIs
# ===========================================================================
total_spend = float(df['spend'].sum()) if safe_col(df, 'spend') else 0
total_results = int(df['results'].sum()) if safe_col(df, 'results') else 0
total_reach = safe_sum(df, 'reach')
total_impressions = safe_sum(df, 'impressions')
total_clicks = safe_sum(df, 'link_clicks')
total_clicks_all = safe_sum(df, 'clicks_all')
total_comments = safe_sum(df, 'comments')

avg_cpm = float(total_spend / (total_impressions / 1000)) if total_impressions > 0 else 0
avg_cpc = float(total_spend / total_clicks) if total_clicks > 0 else 0
avg_ctr = float((total_clicks_all / total_impressions) * 100) if total_impressions > 0 else 0
avg_frequency = float(total_impressions / total_reach) if total_reach > 0 else 0
avg_cpr = float(total_spend / total_results) if total_results > 0 else 0

# Campaign count
campaign_count = int(df['campaign'].nunique()) if safe_col(df, 'campaign') else 0

# Result type summary
result_type_summary = None
if safe_col(df, 'result_type'):
    result_type_summary = df.groupby('result_type').agg(
        total_spend=('spend', 'sum'),
        total_results=('results', 'sum'),
        total_reach=('reach', 'sum'),
        campaign_count=('campaign', 'nunique'),
        rows=('campaign', 'count')
    ).reset_index()
    result_type_summary['cost_per_result'] = result_type_summary.apply(
        lambda r: r['total_spend'] / r['total_results'] if r['total_results'] > 0 else 0, axis=1
    )

global_kpis = {
    'total_spend': round(total_spend, 2),
    'total_reach': total_reach,
    'total_impressions': total_impressions,
    'total_results': total_results,
    'total_clicks': total_clicks,
    'total_comments': total_comments,
    'cost_per_result': round(avg_cpr, 4),
    'avg_cpm': round(avg_cpm, 4),
    'avg_cpc': round(avg_cpc, 4),
    'avg_ctr': round(avg_ctr, 4),
    'avg_frequency': round(avg_frequency, 2),
    'unique_campaigns': campaign_count,
    'total_rows': len(df),
    'result_type_breakdown': [
        {
            'type': row['result_type'],
            'spend': round(float(row['total_spend']), 2),
            'results': int(row['total_results']),
            'cost_per_result': round(float(row['cost_per_result']), 4),
            'campaigns': int(row['campaign_count']),
            'pct_spend': round(float(row['total_spend'] / total_spend * 100), 1) if total_spend > 0 else 0,
            'pct_results': round(float(row['total_results'] / total_results * 100), 1) if total_results > 0 else 0,
        }
        for _, row in result_type_summary.iterrows()
    ] if result_type_summary is not None else []
}

# ===========================================================================
# CAMPAIGN PERFORMANCE
# ===========================================================================
print("[2/3] Analyzing campaigns, demographics, efficiency...")

agg_cols = {}
if safe_col(df, 'spend'): agg_cols['total_spend'] = ('spend', 'sum')
if safe_col(df, 'results'): agg_cols['total_results'] = ('results', 'sum')
if safe_col(df, 'reach'): agg_cols['total_reach'] = ('reach', 'sum')
if safe_col(df, 'impressions'): agg_cols['total_impressions'] = ('impressions', 'sum')
if safe_col(df, 'link_clicks'): agg_cols['total_clicks'] = ('link_clicks', 'sum')
if safe_col(df, 'ctr_all'): agg_cols['avg_ctr'] = ('ctr_all', 'mean')
if safe_col(df, 'cpm'): agg_cols['avg_cpm'] = ('cpm', 'mean')
if safe_col(df, 'comments'): agg_cols['total_comments'] = ('comments', 'sum')

campaign_agg = df.groupby('campaign').agg(**agg_cols).reset_index() if safe_col(df, 'campaign') else pd.DataFrame()

if len(campaign_agg) > 0 and 'total_spend' in campaign_agg.columns and 'total_results' in campaign_agg.columns:
    campaign_agg['cost_per_result'] = campaign_agg['total_spend'] / campaign_agg['total_results'].replace(0, np.nan)
    campaign_agg['efficiency_score'] = campaign_agg['total_results'] / campaign_agg['total_spend'].replace(0, np.nan)
    campaign_agg = campaign_agg.sort_values('total_spend', ascending=False)

    # Add result type per campaign
    if safe_col(df, 'result_type'):
        rt = df.groupby('campaign')['result_type'].first()
        campaign_agg['result_type'] = campaign_agg['campaign'].map(rt)

    # Pareto
    campaign_agg['spend_cumulative'] = campaign_agg['total_spend'].cumsum()
    campaign_agg['spend_cumulative_pct'] = campaign_agg['spend_cumulative'] / total_spend * 100
    campaign_agg['results_cumulative'] = campaign_agg['total_results'].cumsum()
    campaign_agg['results_cumulative_pct'] = campaign_agg['results_cumulative'] / total_results * 100 if total_results > 0 else 0

    pareto_80_count = int((campaign_agg['spend_cumulative_pct'] <= 80).sum())
    pareto_80_results_pct = float(campaign_agg.loc[
        campaign_agg['spend_cumulative_pct'] <= 80, 'total_results'
    ].sum() / total_results * 100) if total_results > 0 else 0

    # Top campaigns
    top_campaigns = []
    for _, row in campaign_agg.head(10).iterrows():
        c = {'campaign': row['campaign'], 'spend': round(float(row['total_spend']), 2),
             'results': int(row['total_results']),
             'cost_per_result': round(float(row.get('cost_per_result', 0)), 4) if pd.notna(row.get('cost_per_result')) else 0,
             'efficiency_score': round(float(row.get('efficiency_score', 0)), 4) if pd.notna(row.get('efficiency_score')) else 0}
        if 'result_type' in row: c['result_type'] = str(row['result_type']) if pd.notna(row.get('result_type')) else ''
        if 'total_reach' in row: c['reach'] = int(row['total_reach'])
        top_campaigns.append(c)

    # Most efficient
    efficient = campaign_agg[campaign_agg['total_results'] > 0].sort_values('cost_per_result')
    most_efficient = []
    for _, row in efficient.head(10).iterrows():
        c = {'campaign': row['campaign'], 'spend': round(float(row['total_spend']), 2),
             'results': int(row['total_results']),
             'cost_per_result': round(float(row.get('cost_per_result', 0)), 4) if pd.notna(row.get('cost_per_result')) else 0,
             'efficiency_score': round(float(row.get('efficiency_score', 0)), 4) if pd.notna(row.get('efficiency_score')) else 0}
        if 'result_type' in row: c['result_type'] = str(row['result_type']) if pd.notna(row.get('result_type')) else ''
        most_efficient.append(c)

    pareto_data = [
        {'campaign': row['campaign'], 'spend': round(float(row['total_spend']), 2),
         'spend_cumulative_pct': round(float(row['spend_cumulative_pct']), 2),
         'results': int(row['total_results']),
         'results_cumulative_pct': round(float(row.get('results_cumulative_pct', 0)), 2)}
        for _, row in campaign_agg.iterrows()
    ]

    all_campaigns = [
        {'campaign': row['campaign'], 'spend': round(float(row['total_spend']), 2),
         'results': int(row['total_results']),
         'cpr': round(float(row.get('cost_per_result', 0)), 4) if pd.notna(row.get('cost_per_result')) else None}
        for _, row in campaign_agg.iterrows()
    ]
else:
    top_campaigns = []
    most_efficient = []
    pareto_data = []
    all_campaigns = []
    pareto_80_count = 0
    pareto_80_results_pct = 0

campaign_performance = {
    'top_campaigns': top_campaigns,
    'most_efficient': most_efficient,
    'pareto': {'campaigns_for_80pct_spend': pareto_80_count, 'results_from_80pct_spend': round(pareto_80_results_pct, 1), 'data': pareto_data},
    'all_campaigns': all_campaigns,
}

# ===========================================================================
# DEMOGRAPHICS
# ===========================================================================
demographic_analysis = {}

if safe_col(df, 'age') and safe_col(df, 'gender'):
    demo_agg = df.groupby(['age', 'gender']).agg(
        total_spend=('spend', 'sum'),
        total_results=('results', 'sum'),
        total_reach=('reach', 'sum') if safe_col(df, 'reach') else ('spend', 'count'),
    ).reset_index()
    demo_agg['cost_per_result'] = demo_agg['total_spend'] / demo_agg['total_results'].replace(0, np.nan)

    def pivot_to_list(pivot_df):
        data = []
        for age_val in pivot_df.index:
            row_data = {'age': age_val}
            for gender_val in pivot_df.columns:
                row_data[gender_val] = round(float(pivot_df.loc[age_val, gender_val]), 2)
            data.append(row_data)
        return data

    spend_pivot = demo_agg.pivot_table(index='age', columns='gender', values='total_spend', aggfunc='sum', fill_value=0)
    results_pivot = demo_agg.pivot_table(index='age', columns='gender', values='total_results', aggfunc='sum', fill_value=0)
    cpr_pivot = demo_agg.pivot_table(index='age', columns='gender', values='cost_per_result', aggfunc='mean', fill_value=0)

    age_agg = df.groupby('age').agg(spend=('spend', 'sum'), results=('results', 'sum')).reset_index()
    age_agg['pct_spend'] = age_agg['spend'] / total_spend * 100 if total_spend > 0 else 0

    best_demo = demo_agg[(demo_agg['total_results'] > 0) & (demo_agg['total_spend'] > 10)].sort_values('cost_per_result')
    best_demographics = [
        {'age': row['age'], 'gender': row['gender'],
         'cost_per_result': round(float(row['cost_per_result']), 4),
         'results': int(row['total_results']),
         'spend': round(float(row['total_spend']), 2)}
        for _, row in best_demo.head(10).iterrows()
    ]

    demographic_analysis = {
        'heatmap_spend': pivot_to_list(spend_pivot),
        'heatmap_results': pivot_to_list(results_pivot),
        'heatmap_cpr': pivot_to_list(cpr_pivot),
        'age_distribution': [
            {'age': row['age'], 'spend': round(float(row['spend']), 2),
             'results': int(row['results']),
             'pct_spend': round(float(row['pct_spend']), 1)}
            for _, row in age_agg.iterrows()
        ],
        'best_demographics': best_demographics,
    }

# ===========================================================================
# CLUSTERING
# ===========================================================================
clustering = {}
if len(campaign_agg) > 10:
    try:
        from sklearn.preprocessing import StandardScaler
        from sklearn.cluster import KMeans

        cluster_features = ['total_spend', 'total_results']
        if 'total_reach' in campaign_agg.columns:
            cluster_features.append('total_reach')
        if 'avg_ctr' in campaign_agg.columns:
            cluster_features.append('avg_ctr')

        cluster_df = campaign_agg[cluster_features].dropna()
        if len(cluster_df) > 10:
            scaler = StandardScaler()
            X = scaler.fit_transform(cluster_df)
            n_clusters = min(4, len(cluster_df) // 3)
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            labels = kmeans.fit_predict(X)
            campaign_agg.loc[cluster_df.index, 'cluster'] = labels

            cluster_summary = []
            for c in range(n_clusters):
                mask = campaign_agg['cluster'] == c
                cluster_summary.append({
                    'cluster': int(c),
                    'count': int(mask.sum()),
                    'avg_spend': round(float(campaign_agg.loc[mask, 'total_spend'].mean()), 2),
                    'avg_results': round(float(campaign_agg.loc[mask, 'total_results'].mean()), 1),
                })
            clustering = {'n_clusters': n_clusters, 'summary': cluster_summary}
    except ImportError:
        pass

# ===========================================================================
# FUNNEL (conversations)
# ===========================================================================
conversation_analysis = {}
if os.path.exists(JSON_PATH):
    print("   Loading conversations JSON...")
    try:
        with open(JSON_PATH, 'r', encoding='utf-8') as f:
            conv_data = json.load(f)

        if isinstance(conv_data, list):
            conversations = conv_data
        elif isinstance(conv_data, dict):
            conversations = conv_data.get('conversations', conv_data.get('data', []))
        else:
            conversations = []

        total_convs = len(conversations)
        conversation_analysis = {
            'total_conversations': total_convs,
            'has_data': total_convs > 0,
        }

        # Try to extract common fields
        if total_convs > 0:
            sample = conversations[0]
            if isinstance(sample, dict):
                conversation_analysis['sample_fields'] = list(sample.keys())[:10]

        # =======================================================
        # NLP Analysis (Intents, Sentiment, Length)
        # Fixes: #1 total_messages, #2 total field, #3 polarity,
        #        #4 lead_funnel, #5 conversion_rate, #6 pct,
        #        #7 word-boundary, #8 quiero separation
        # =======================================================
        import re
        print("   Running conversation NLP analysis...")
        
        # ============================================================
        # SENTIMENT ANALYSIS v2: Context-aware, session-level
        # ============================================================
        # Positive signals: genuine satisfaction/agreement phrases
        positive_phrases = [
            ('gracias', 2), ('muchas gracias', 3), ('excelente', 3),
            ('perfecto', 3), ('genial', 2), ('maravilloso', 3),
            ('muy bien', 2), ('me encanta', 3), ('increíble', 3),
            ('listo', 1), ('dale', 1), ('ok gracias', 2),
            ('si quiero', 2), ('me interesa', 2), ('quiero comprar', 3),
            ('quiero pedir', 3), ('voy a comprar', 3),
            ('super', 2), ('buenísimo', 3), ('lo quiero', 2),
            ('estoy interesad', 2), ('me gusta', 2),
            ('ok perfecto', 2), ('bueno gracias', 2),
            ('suena bien', 2), ('claro que si', 2),
        ]
        # Negative signals: genuine dissatisfaction (NOT commercial queries)
        negative_phrases = [
            ('estafa', 3), ('horrible', 3), ('pésimo', 3),
            ('no sirve', 3), ('no funciona', 3), ('no me gust', 2),
            ('muy mal', 2), ('mala experiencia', 3),
            ('no recomiendo', 3), ('decepcionad', 3),
            ('reclamo', 2), ('devolver', 2), ('no llega', 2),
            ('robo', 3), ('mentira', 3), ('fraude', 3),
            ('peor', 2), ('basura', 3), ('falso', 2),
            ('demasiado caro', 2), ('muy caro', 2),
            ('no vale la pena', 3), ('no vuelvo', 3),
        ]
        # Phrases that should NOT count as negative even though they
        # contain words like 'mal', 'caro', 'problema', 'nunca':
        # - "mal de estomago" = health symptom description
        # - "es caro?" / "caro?" = price inquiry (neutral)
        # - "nunca lo he probado" / "nunca he usado" = new prospect (neutral)
        # - "tiene algun problema" = product inquiry (neutral)
        # These are now excluded because we use PHRASES, not single words.
        
        def _has_phrase(text, phrase):
            """Check if phrase exists in text (substring match for phrases, word-boundary for single words)."""
            if ' ' in phrase:
                return phrase in text
            return bool(re.search(r'\b' + re.escape(phrase) + r'\b', text))
        
        def get_sentiment_score(text):
            """Returns (label, score) based on weighted phrase matching."""
            text = str(text).lower().strip()
            if len(text) < 2:
                return 'neutral', 0
            
            pos_score = sum(weight for phrase, weight in positive_phrases if _has_phrase(text, phrase))
            neg_score = sum(weight for phrase, weight in negative_phrases if _has_phrase(text, phrase))
            
            net = pos_score - neg_score
            if net >= 2: return 'positive', 1
            if net <= -2: return 'negative', -1
            if net == 1: return 'positive', 0.5
            if net == -1: return 'negative', -0.5
            return 'neutral', 0

        # --- Intent keywords (separated from sentiment) ---
        intents_map = {
            'precio': ['precio', 'costo', 'cuesta', 'valor', 'cuanto vale', 'cuánto'],
            'ubicacion': ['donde', 'ubicacion', 'tienda', 'direccion', 'local', 'ciudad', 'dónde'],
            'informacion': ['info', 'informacion', 'detalle', 'producto', 'sirve', 'beneficios', 'características'],
            'compra': ['comprar', 'pedido', 'quiero', 'interesa', 'orden', 'pago', 'envío', 'delivery'],
            'saludo': ['hola', 'buenos', 'buenas', 'saludos', 'buen día'],
            'reclamo': ['queja', 'reclamo', 'no llega', 'no funciona', 'devolver', 'estafa'],
        }
        
        def get_intent(text):
            text = str(text).lower()
            for intent, keywords in intents_map.items():
                if any(k in text for k in keywords):
                    return intent
            return 'general'

        # Process conversations — collect sentiment PER SESSION
        session_counts = {}       # session_id -> message count
        session_intents = {}      # session_id -> set of intents seen
        session_sentiment_scores = {}  # session_id -> list of scores
        intent_counts = {k: 0 for k in intents_map.keys()}
        intent_counts['general'] = 0
        total_human_msgs = 0
        
        for c in conversations:
            sess_id = c.get('session_id', 'unknown')
            msg_obj = c.get('message', {})
            content = ""
            
            if isinstance(msg_obj, dict):
                content = msg_obj.get('content', '')
                msg_type = msg_obj.get('type', 'unknown')
            else:
                content = str(msg_obj)
                msg_type = 'unknown'

            session_counts[sess_id] = session_counts.get(sess_id, 0) + 1
            
            if msg_type == 'human':
                total_human_msgs += 1
                
                intent = get_intent(content)
                intent_counts[intent] += 1
                
                # Track intents per session for funnel
                if sess_id not in session_intents:
                    session_intents[sess_id] = set()
                session_intents[sess_id].add(intent)
                
                # Collect sentiment scores per session
                _, score = get_sentiment_score(content)
                if sess_id not in session_sentiment_scores:
                    session_sentiment_scores[sess_id] = []
                session_sentiment_scores[sess_id].append(score)
        
        # Aggregate sentiment at SESSION level (not message level)
        sentiment_counts = {'positive': 0, 'neutral': 0, 'negative': 0}
        polarity_sum = 0.0
        for sess_id, scores in session_sentiment_scores.items():
            session_avg = sum(scores) / len(scores) if scores else 0
            polarity_sum += session_avg
            if session_avg > 0.15:
                sentiment_counts['positive'] += 1
            elif session_avg < -0.15:
                sentiment_counts['negative'] += 1
            else:
                sentiment_counts['neutral'] += 1

        total_sessions = len(session_counts)

        # --- FIX #6: Intent Analysis with pct ---
        sorted_intents = []
        for k, v in intent_counts.items():
            pct = round(v / total_human_msgs * 100, 1) if total_human_msgs > 0 else 0
            sorted_intents.append({'intent': k, 'count': v, 'pct': pct})
        sorted_intents.sort(key=lambda x: x['count'], reverse=True)
        conversation_analysis['intent_analysis'] = sorted_intents
        
        # --- Session-level avg_polarity ---
        total_sentiment_sessions = len(session_sentiment_scores)
        avg_polarity = round(polarity_sum / total_sentiment_sessions, 4) if total_sentiment_sessions > 0 else 0.0
        conversation_analysis['sentiment'] = {
            'distribution': sentiment_counts,
            'avg_polarity': avg_polarity
        }
        
        # --- FIX #2: conversion_by_length uses 'total' not 'count' ---
        len_buckets = {'1-2': 0, '3-5': 0, '6-10': 0, '10+': 0}
        for count in session_counts.values():
            if count <= 2: len_buckets['1-2'] += 1
            elif count <= 5: len_buckets['3-5'] += 1
            elif count <= 10: len_buckets['6-10'] += 1
            else: len_buckets['10+'] += 1
            
        conversion_by_length = []
        for bucket, cnt in len_buckets.items():
            rate = round(cnt / total_sessions * 100, 1) if total_sessions > 0 else 0
            conversion_by_length.append({'length': bucket, 'total': cnt, 'rate': rate})
            
        conversation_analysis['conversion_by_length'] = conversion_by_length
        
        # --- FIX #1: Add total_messages for the frontend ---
        conversation_analysis['total_sessions'] = total_sessions
        conversation_analysis['total_messages'] = total_convs

        # --- FIX #4 & #5: Build lead_funnel from intent progression ---
        # Funnel: Saludo → Info/Precio → Compra
        sessions_with_saludo = sum(1 for s in session_intents.values() if 'saludo' in s)
        sessions_with_info = sum(1 for s in session_intents.values() if s & {'informacion', 'precio', 'ubicacion'})
        sessions_with_compra = sum(1 for s in session_intents.values() if 'compra' in s)
        
        funnel_steps = [
            {'step': 'Inicio conversación', 'count': total_sessions, 'pct': 100.0},
            {'step': 'Saludo', 'count': sessions_with_saludo, 'pct': round(sessions_with_saludo / total_sessions * 100, 1) if total_sessions > 0 else 0},
            {'step': 'Consulta (Info/Precio)', 'count': sessions_with_info, 'pct': round(sessions_with_info / total_sessions * 100, 1) if total_sessions > 0 else 0},
            {'step': 'Intención de compra', 'count': sessions_with_compra, 'pct': round(sessions_with_compra / total_sessions * 100, 1) if total_sessions > 0 else 0},
        ]
        
        conversion_rate = round(sessions_with_compra / total_sessions * 100, 1) if total_sessions > 0 else 0
        
        conversation_analysis['lead_funnel'] = {
            'total_sessions': total_sessions,
            'funnel_steps': funnel_steps,
            'conversion_rate_complete': conversion_rate
        }

    except Exception as e:
        print(f"   Warning: Error in NLP analysis: {e}")

# ===========================================================================
# SAVE ANALYSIS_RESULTS.JSON
# ===========================================================================
analysis_results = {
    'metadata': {
        'client': CLIENT,
        'report_period': 'Auto-detected',
        'generated_at': pd.Timestamp.now().isoformat(),
        'total_rows': len(df),
        'total_columns': len(df.columns),
        'columns_found': list(df.columns),
    },
    'global_kpis': global_kpis,
    'campaign_performance': campaign_performance,
    'demographic_analysis': demographic_analysis,
    'clustering': clustering,
    'conversation_analysis': conversation_analysis,
}

# Auto-detect report period
if safe_col(df, 'report_start') and safe_col(df, 'report_end'):
    try:
        starts = pd.to_datetime(df['report_start'], errors='coerce').dropna()
        ends = pd.to_datetime(df['report_end'], errors='coerce').dropna()
        if len(starts) > 0 and len(ends) > 0:
            analysis_results['metadata']['report_period'] = f"{starts.min().strftime('%Y-%m-%d')} to {ends.max().strftime('%Y-%m-%d')}"
    except:
        pass

out1 = os.path.join(OUTPUT_DIR, 'analysis_results.json')
with open(out1, 'w', encoding='utf-8') as f:
    json.dump(sanitize_for_json(analysis_results), f, indent=2, ensure_ascii=False, default=str)
print(f"   Saved: {out1}")


# ===========================================================================
# DEEP ANALYSIS (deep_analysis.json)
# ===========================================================================
print("[3/3] Deep analysis (video, frequency, delivery, correlations)...")

deep = {}

# --- Video retention ---
vid_cols_canonical = ['video_25', 'video_50', 'video_75', 'video_95', 'video_100']
available_vid = [c for c in vid_cols_canonical if safe_col(df, c)]
if len(available_vid) >= 3:
    vid_df = df.dropna(subset=available_vid, how='all')
    if len(vid_df) > 0:
        totals = {c: int(vid_df[c].sum()) for c in available_vid}
        base = totals.get('video_25', 1) or 1
        deep['video_retention'] = {
            'totals': totals,
            'retention_rates': {c: round(totals[c] / base * 100, 1) for c in available_vid},
        }
        if safe_col(df, 'video_avg_time'):
            apt = df['video_avg_time'].dropna()
            if len(apt) > 0:
                deep['video_retention']['avg_play_time'] = {
                    'mean': round(float(apt.mean()), 2),
                    'median': round(float(apt.median()), 2),
                    'max': round(float(apt.max()), 2),
                }
        # By age
        if safe_col(df, 'age'):
            vid_by_age = vid_df.groupby('age')[available_vid].sum()
            if 'video_25' in available_vid and 'video_100' in available_vid:
                vid_by_age['retention'] = vid_by_age['video_100'] / vid_by_age['video_25'].replace(0, np.nan) * 100
                deep['video_retention']['by_age'] = [
                    {'age': idx, 'retention_100': round(float(row.get('retention', 0)), 1)}
                    for idx, row in vid_by_age.iterrows()
                ]

# --- Frequency optimization ---
if safe_col(df, 'frequency'):
    freq_df = df[df['frequency'].notna() & (df['frequency'] > 0)].copy()
    if len(freq_df) > 0:
        freq_df['freq_bucket'] = pd.cut(freq_df['frequency'],
            bins=[0, 1.5, 2.5, 4, 8, 100],
            labels=['1-1.5', '1.5-2.5', '2.5-4', '4-8', '8+'])
        freq_analysis = freq_df.groupby('freq_bucket', observed=True).agg(
            spend=('spend', 'sum'), results=('results', 'sum'), rows=('campaign', 'count')
        )
        freq_analysis['cpr'] = freq_analysis['spend'] / freq_analysis['results'].replace(0, np.nan)
        deep['frequency_optimization'] = {
            'avg_frequency': round(float(freq_df['frequency'].mean()), 2),
            'by_bucket': [
                {'bucket': str(idx), 'spend': round(float(row['spend']), 2),
                 'results': int(row['results']), 'cpr': round(float(row['cpr']), 2) if pd.notna(row['cpr']) else None,
                 'rows': int(row['rows'])}
                for idx, row in freq_analysis.iterrows()
            ]
        }

# --- Delivery status ---
if safe_col(df, 'status'):
    del_analysis = df.groupby('status').agg(
        spend=('spend', 'sum'), results=('results', 'sum'), campaigns=('campaign', 'nunique')
    ).reset_index()
    del_analysis['cpr'] = del_analysis['spend'] / del_analysis['results'].replace(0, np.nan)
    deep['delivery_status'] = [
        {'status': row['status'], 'spend': round(float(row['spend']), 2),
         'results': int(row['results']), 'campaigns': int(row['campaigns']),
         'cpr': round(float(row['cpr']), 2) if pd.notna(row['cpr']) else None}
        for _, row in del_analysis.iterrows()
    ]

# --- Engagement ---
if safe_col(df, 'comments'):
    eng_df = df[df['comments'].notna() & (df['comments'] > 0)]
    if len(eng_df) > 0:
        deep['engagement'] = {
            'total_comments': int(df['comments'].sum()),
            'avg_comments': round(float(df['comments'].mean()), 2),
        }
        if safe_col(df, 'campaign'):
            top_eng = eng_df.groupby('campaign')['comments'].sum().sort_values(ascending=False).head(10)
            deep['engagement']['top_campaigns'] = [
                {'campaign': idx, 'comments': int(val)} for idx, val in top_eng.items()
            ]

# --- Age performance ---
if safe_col(df, 'age'):
    age_perf = df.groupby('age').agg(
        spend=('spend', 'sum'), results=('results', 'sum'),
    ).reset_index()
    age_perf['cpr'] = age_perf['spend'] / age_perf['results'].replace(0, np.nan)

    extra_age_cols = {}
    if safe_col(df, 'cpm'): extra_age_cols['cpm'] = ('cpm', 'mean')
    if safe_col(df, 'cpc'): extra_age_cols['cpc'] = ('cpc', 'mean')
    if safe_col(df, 'ctr_all'): extra_age_cols['ctr'] = ('ctr_all', 'mean')
    if safe_col(df, 'comments'): extra_age_cols['comments'] = ('comments', 'sum')
    if safe_col(df, 'link_clicks'): extra_age_cols['link_clicks'] = ('link_clicks', 'sum')

    if extra_age_cols:
        age_extra = df.groupby('age').agg(**extra_age_cols).reset_index()
        age_perf = age_perf.merge(age_extra, on='age', how='left')

    deep['age_performance'] = [
        {k: round(float(v), 4) if isinstance(v, (float, np.floating)) else v
         for k, v in row.items()}
        for _, row in age_perf.iterrows()
    ]

# --- Gender performance ---
if safe_col(df, 'gender'):
    gen_perf = df.groupby('gender').agg(
        spend=('spend', 'sum'), results=('results', 'sum'),
    ).reset_index()
    gen_perf['cpr'] = gen_perf['spend'] / gen_perf['results'].replace(0, np.nan)

    extra_gen_cols = {}
    if safe_col(df, 'ctr_all'): extra_gen_cols['ctr'] = ('ctr_all', 'mean')
    if safe_col(df, 'comments'): extra_gen_cols['comments'] = ('comments', 'sum')
    if safe_col(df, 'link_clicks'): extra_gen_cols['link_clicks'] = ('link_clicks', 'sum')
    if safe_col(df, 'frequency'): extra_gen_cols['frequency'] = ('frequency', 'mean')

    if extra_gen_cols:
        gen_extra = df.groupby('gender').agg(**extra_gen_cols).reset_index()
        gen_perf = gen_perf.merge(gen_extra, on='gender', how='left')

    deep['gender_performance'] = [
        {k: round(float(v), 4) if isinstance(v, (float, np.floating)) else v
         for k, v in row.items()}
        for _, row in gen_perf.iterrows()
    ]

# --- Correlations ---
corr_pairs = [
    ('reach', 'results'), ('impressions', 'comments'), ('spend', 'results'),
    ('frequency', 'results'), ('cpm', 'ctr_all'), ('spend', 'ctr_all'),
    ('frequency', 'ctr_all'),
]
correlations = []
for col_a, col_b in corr_pairs:
    if safe_col(df, col_a) and safe_col(df, col_b):
        valid = df[[col_a, col_b]].dropna()
        if len(valid) > 10:
            r, p = stats.pearsonr(valid[col_a], valid[col_b])
            correlations.append({
                'var_a': col_a, 'var_b': col_b,
                'pearson_r': round(float(r), 4), 'p_value': round(float(p), 6),
            })
deep['correlations'] = correlations

# --- Full campaign ranking ---
if len(campaign_agg) > 0:
    ranked = campaign_agg.copy()
    if 'efficiency_score' in ranked.columns:
        ranked_sorted = ranked.sort_values('efficiency_score', ascending=False)
        deep['campaign_ranking'] = {
            'top': [
                {'campaign': row['campaign'], 'spend': round(float(row['total_spend']), 2),
                 'results': int(row['total_results']),
                 'cpr': round(float(row.get('cost_per_result', 0)), 4) if pd.notna(row.get('cost_per_result')) else None,
                 'efficiency': round(float(row.get('efficiency_score', 0)), 4) if pd.notna(row.get('efficiency_score')) else None}
                for _, row in ranked_sorted.head(10).iterrows()
            ],
            'bottom': [
                {'campaign': row['campaign'], 'spend': round(float(row['total_spend']), 2),
                 'results': int(row['total_results']),
                 'cpr': round(float(row.get('cost_per_result', 0)), 4) if pd.notna(row.get('cost_per_result')) else None}
                for _, row in ranked_sorted.tail(10).iterrows()
            ]
        }

out2 = os.path.join(OUTPUT_DIR, 'deep_analysis.json')
with open(out2, 'w', encoding='utf-8') as f:
    json.dump(sanitize_for_json(deep), f, indent=2, ensure_ascii=False, default=str)
print(f"   Saved: {out2}")


# ===========================================================================
# ADVANCED ANALYSIS (advanced_analysis.json)
# ===========================================================================
print("   Advanced analysis (products, waste, anomalies)...")

advanced = {}

# --- Product extraction from campaign names ---
if safe_col(df, 'campaign'):
    product_patterns = {
        'PIRAMIDE': r'piramide|pirámide',
        'RACK': r'\brack\b',
        'PASILLO': r'pasillo',
        'GONDOLA': r'gondola|góndola',
        'CHECK OUT': r'check\s*out|checkout',
        'MOSTRADOR': r'mostrador',
        'ESTANTE': r'estante',
        'ROSARIO': r'rosario',
        'SIERRA': r'sierra',
    }

    def extract_product(name):
        name_upper = str(name).upper()
        for product, pattern in product_patterns.items():
            if re.search(pattern, name_upper, re.IGNORECASE):
                return product
        return 'OTROS'

    df['product_category'] = df['campaign'].apply(extract_product)

    prod_perf = df.groupby('product_category').agg(
        spend=('spend', 'sum'), results=('results', 'sum'),
        reach=('reach', 'sum') if safe_col(df, 'reach') else ('spend', 'count'),
        campaigns=('campaign', 'nunique'),
    ).reset_index()
    prod_perf['cpr'] = prod_perf['spend'] / prod_perf['results'].replace(0, np.nan)
    prod_perf = prod_perf.sort_values('spend', ascending=False)

    advanced['product_performance'] = [
        {'product': row['product_category'], 'spend': round(float(row['spend']), 2),
         'results': int(row['results']),
         'cpr': round(float(row['cpr']), 4) if pd.notna(row['cpr']) else None,
         'campaigns': int(row['campaigns']),
         'reach': int(row['reach']) if 'reach' in row else 0}
        for _, row in prod_perf.iterrows()
    ]

# --- Budget waste ---
if safe_col(df, 'results') and safe_col(df, 'spend'):
    waste_df = df[(df['results'] == 0) & (df['spend'] > 0)]
    wasted_spend = float(waste_df['spend'].sum())
    advanced['budget_waste'] = {
        'total_spend': round(total_spend, 2),
        'wasted_spend': round(wasted_spend, 2),
        'waste_percentage': round(wasted_spend / total_spend * 100, 2) if total_spend > 0 else 0,
        'rows_without_results': int(len(waste_df)),
    }
    # Waste by campaign
    if safe_col(df, 'campaign'):
        waste_by_camp = waste_df.groupby('campaign')['spend'].sum().sort_values(ascending=False).head(10)
        advanced['budget_waste']['by_campaign'] = [
            {'campaign': idx, 'wasted': round(float(val), 2)} for idx, val in waste_by_camp.items()
        ]
    # Waste by product
    if 'product_category' in df.columns:
        waste_by_prod = waste_df.groupby('product_category')['spend'].sum().sort_values(ascending=False)
        advanced['budget_waste']['by_product'] = [
            {'product': idx, 'wasted': round(float(val), 2)} for idx, val in waste_by_prod.items()
        ]

# --- Ad fatigue ---
if safe_col(df, 'frequency') and safe_col(df, 'reach'):
    df['saturation_ratio'] = df['impressions'] / df['reach'].replace(0, np.nan)
    sat_df = df[df['saturation_ratio'].notna()].copy()
    if len(sat_df) > 0:
        sat_buckets = pd.cut(sat_df['saturation_ratio'], bins=[0, 1.5, 2.5, 4, 8, 100],
                             labels=['1-1.5x', '1.5-2.5x', '2.5-4x', '4-8x', '8x+'])
        sat_analysis = sat_df.groupby(sat_buckets, observed=True).agg(
            ctr=('ctr_all', 'mean') if safe_col(df, 'ctr_all') else ('spend', 'count'),
            spend=('spend', 'sum'), results=('results', 'sum'), rows=('campaign', 'count')
        )
        advanced['ad_fatigue'] = {
            'by_saturation': [
                {'bucket': str(idx), 'ctr': round(float(row.get('ctr', 0)), 4),
                 'spend': round(float(row['spend']), 2), 'results': int(row['results'])}
                for idx, row in sat_analysis.iterrows()
            ]
        }

# --- Anomaly detection ---
try:
    from sklearn.preprocessing import StandardScaler
    from sklearn.ensemble import IsolationForest

    features_for_anomaly = [c for c in ['spend', 'results', 'ctr_all', 'frequency', 'reach'] if safe_col(df, c)]
    if len(features_for_anomaly) >= 3:
        anom_df = df[features_for_anomaly].dropna()
        if len(anom_df) > 50:
            scaler = StandardScaler()
            X = scaler.fit_transform(anom_df)
            iso = IsolationForest(contamination=0.05, random_state=42)
            predictions = iso.fit_predict(X)
            scores = iso.decision_function(X)
            anom_df = anom_df.copy()
            anom_df['anomaly'] = predictions
            anom_df['anomaly_score'] = scores
            if safe_col(df, 'campaign'):
                anom_df['campaign'] = df.loc[anom_df.index, 'campaign']

            anomalies = anom_df[anom_df['anomaly'] == -1]
            advanced['anomaly_detection'] = {
                'total_anomalies': int(len(anomalies)),
                'anomalies': [
                    {k: round(float(v), 4) if isinstance(v, (float, np.floating)) else v
                     for k, v in row.items()}
                    for _, row in anomalies.head(15).iterrows()
                ]
            }
except ImportError:
    pass

# --- Diminishing returns ---
if len(campaign_agg) > 0 and 'total_spend' in campaign_agg.columns and 'total_results' in campaign_agg.columns:
    camp_with_results = campaign_agg[campaign_agg['total_results'] > 0].copy()
    if len(camp_with_results) > 5:
        camp_with_results['spend_bucket'] = pd.cut(camp_with_results['total_spend'],
            bins=[0, 50, 100, 200, 500, 1000, 5000, 50000],
            labels=['$0-50', '$50-100', '$100-200', '$200-500', '$500-1K', '$1K-5K', '$5K+'])
        dim_ret = camp_with_results.groupby('spend_bucket', observed=True).agg(
            avg_cpr=('cost_per_result', 'mean'),
            avg_efficiency=('efficiency_score', 'mean'),
            campaigns=('campaign', 'count')
        )
        advanced['diminishing_returns'] = [
            {'bucket': str(idx), 'avg_cpr': round(float(row['avg_cpr']), 4),
             'avg_efficiency': round(float(row['avg_efficiency']), 4),
             'campaigns': int(row['campaigns'])}
            for idx, row in dim_ret.iterrows()
        ]

# --- Quality ranking ---
if safe_col(df, 'ctr_all'):
    scored = df.copy()
    score_cols = []
    for col in ['ctr_all', 'result_rate']:
        if safe_col(scored, col):
            s = scored[col].dropna()
            if len(s) > 0:
                scored[f'{col}_norm'] = (scored[col] - s.min()) / (s.max() - s.min() + 1e-9)
                score_cols.append(f'{col}_norm')

    if score_cols and safe_col(df, 'campaign'):
        scored['quality_score'] = scored[score_cols].mean(axis=1) * 100
        quality_by_camp = scored.groupby('campaign').agg(
            quality_score=('quality_score', 'mean'),
            spend=('spend', 'sum'),
            results=('results', 'sum'),
        ).sort_values('quality_score', ascending=False)

        advanced['quality_ranking'] = {
            'top_quality': [
                {'campaign': idx, 'quality_score': round(float(row['quality_score']), 1),
                 'spend': round(float(row['spend']), 2), 'results': int(row['results'])}
                for idx, row in quality_by_camp.head(10).iterrows()
            ],
            'worst_quality': [
                {'campaign': idx, 'quality_score': round(float(row['quality_score']), 1),
                 'spend': round(float(row['spend']), 2), 'results': int(row['results'])}
                for idx, row in quality_by_camp.tail(10).iterrows()
            ]
        }

# --- Campaign keywords ---
if safe_col(df, 'campaign'):
    all_words = []
    for name in df['campaign'].unique():
        words = re.findall(r'[A-ZÁÉÍÓÚÑ]{3,}', str(name).upper())
        all_words.extend(words)
    word_freq = pd.Series(all_words).value_counts().head(20)
    advanced['campaign_keywords'] = [
        {'word': w, 'count': int(c)} for w, c in word_freq.items()
    ]

out3 = os.path.join(OUTPUT_DIR, 'advanced_analysis.json')
with open(out3, 'w', encoding='utf-8') as f:
    json.dump(sanitize_for_json(advanced), f, indent=2, ensure_ascii=False, default=str)
print(f"   Saved: {out3}")

print("\n" + "=" * 70)
print(f"ANALYSIS COMPLETE for {CLIENT}")
print(f"  Output: {OUTPUT_DIR}")
print(f"  Files: analysis_results.json, deep_analysis.json, advanced_analysis.json")
print("=" * 70)
