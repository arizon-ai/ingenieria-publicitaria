#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import pandas as pd
import sys

df = pd.read_csv(r'c:\Onedrive\AJ\ARIZON\veoyoca\h4-report-Nov-1-2025-to-Feb-20-2026.csv')

out = []
out.append('=== UNIQUE CAMPAIGN NAMES + STATS ===')
for c in sorted(df['Campaign name'].unique()):
    sub = df[df['Campaign name']==c]
    spend = sub['Amount spent (USD)'].sum()
    results = sub['Results'].sum()
    msgs = sub['Messaging conversations started'].sum() if 'Messaging conversations started' in sub.columns else 0
    reach = sub['Reach'].sum()
    out.append(f'  [{c}]  Spend=${spend:.2f}  Results={int(results)}  MsgConv={int(msgs)}  Reach={int(reach)}')

out.append('')
out.append('=== MESSAGING CONVERSATIONS DETAIL ===')
if 'Messaging conversations started' in df.columns:
    mc_df = df[df['Messaging conversations started']>0]
    mc = mc_df.groupby('Campaign name').agg(
        msgs=('Messaging conversations started','sum'),
        spend=('Amount spent (USD)','sum'),
        reach=('Reach','sum'),
        new_contacts=('New messaging contacts','sum')
    ).sort_values('msgs',ascending=False)
    for idx,row in mc.iterrows():
        cpm = row['spend']/row['msgs'] if row['msgs']>0 else 0
        out.append(f'  [{idx}]  Msgs={int(row["msgs"])}  Spend=${row["spend"]:.2f}  CostPerMsg=${cpm:.2f}  NewContacts={int(row["new_contacts"])}')

out.append('')
out.append('=== OBJECTIVES ===')
out.append(df['Objective'].value_counts().to_string())

out.append('')
out.append('=== RESULT TYPES ===')
out.append(df['Result type'].value_counts().to_string())

out.append('')
out.append('=== VEHICLE IDENTIFICATION ===')
vehicles = {}
for c in df['Campaign name'].unique():
    cn = c.upper()
    if 'RANGE ROVER' in cn: v='Range Rover'
    elif 'LAND ROVER' in cn: v='Land Rover Discovery'
    elif 'DISCOVERY' in cn: v='Land Rover Discovery Sport'
    elif 'BRONCO' in cn or 'WILDTRAK' in cn: v='Ford Bronco Wildtrak'
    elif 'COROLLA' in cn or 'LEVIN' in cn: v='Toyota Corolla Levin'
    elif 'LC200' in cn: v='Toyota LC200 Blindada'
    elif 'PPF' in cn: v='Servicio PPF/Detailing'
    elif 'H4 AUTOS' in cn: v='Multi-vehiculo (Catalogo)'
    elif 'VALENCIA' in cn: v='Presencia Local Valencia'
    else: v='Branding/Lifestyle'
    if v not in vehicles: vehicles[v]={'spend':0,'results':0,'msgs':0,'reach':0,'campaigns':[],'comments':0,'link_clicks':0,'engagements':0}
    sub = df[df['Campaign name']==c]
    vehicles[v]['spend']+=sub['Amount spent (USD)'].sum()
    vehicles[v]['results']+=sub['Results'].sum()
    vehicles[v]['msgs']+=sub['Messaging conversations started'].sum() if 'Messaging conversations started' in sub.columns else 0
    vehicles[v]['reach']+=sub['Reach'].sum()
    vehicles[v]['comments']+=sub['Post comments'].sum() if 'Post comments' in sub.columns else 0
    vehicles[v]['link_clicks']+=sub['Link clicks'].sum() if 'Link clicks' in sub.columns else 0
    vehicles[v]['engagements']+=sub['Post engagements'].sum() if 'Post engagements' in sub.columns else 0
    vehicles[v]['campaigns'].append(c)

for v,d in sorted(vehicles.items(), key=lambda x:-x[1]['spend']):
    cpmsg = d['spend']/d['msgs'] if d['msgs']>0 else 0
    out.append(f'  {v}:')
    out.append(f'    Spend=${d["spend"]:.2f}  Results={int(d["results"])}  Msgs={int(d["msgs"])}  CostPerMsg=${cpmsg:.2f}')
    out.append(f'    Reach={int(d["reach"])}  Comments={int(d["comments"])}  LinkClicks={int(d["link_clicks"])}  Engagements={int(d["engagements"])}')
    out.append(f'    Campaigns: {len(d["campaigns"])}')
    for camp in d['campaigns']:
        out.append(f'      - {camp}')

out.append('')
out.append('=== NEW MESSAGING CONTACTS TOTAL ===')
if 'New messaging contacts' in df.columns:
    total_new = int(df['New messaging contacts'].sum())
    out.append(f'  Total new messaging contacts: {total_new}')
    nmc = df.groupby('Campaign name')['New messaging contacts'].sum().sort_values(ascending=False)
    for idx,v in nmc.items():
        if v>0:
            out.append(f'  [{idx}]  NewContacts={int(v)}')

out.append('')
out.append('=== POST ENGAGEMENTS TOTAL ===')
if 'Post engagements' in df.columns:
    total_eng = int(df['Post engagements'].sum())
    out.append(f'  Total post engagements: {total_eng}')

out.append('')
out.append('=== MESSAGING CONVERSATIONS per AGE/GENDER ===')
if 'Messaging conversations started' in df.columns:
    mg = df.groupby(['Age','Gender']).agg(
        msgs=('Messaging conversations started','sum'),
        spend=('Amount spent (USD)','sum')
    ).sort_values('msgs',ascending=False)
    for (age,gender),row in mg.iterrows():
        if row['msgs']>0:
            cpm = row['spend']/row['msgs']
            out.append(f'  Age={age}  Gender={gender}  Msgs={int(row["msgs"])}  Spend=${row["spend"]:.2f}  CostPerMsg=${cpm:.2f}')

out.append('')
out.append('=== DELIVERY LEVEL VALUES ===')
out.append(df['Delivery level'].value_counts().to_string())

out.append('')
out.append('=== VIEWS BY CAMPAIGN ===')
if 'Views' in df.columns:
    views = df.groupby('Campaign name')['Views'].sum().sort_values(ascending=False)
    for idx,v in views.items():
        if v>0:
            out.append(f'  [{idx}]  Views={int(v)}')

outpath = r'c:\Onedrive\AJ\ARIZON\veoyoca\clients\h4\analysis\deep_csv_analysis.txt'
with open(outpath, 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print(f'Done - output at {outpath}')
