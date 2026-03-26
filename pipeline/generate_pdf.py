#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
arizon.ai — Branded PDF Report Generator
==========================================
Usage:
    python pipeline/generate_pdf.py --client <name>

Reads:  clients/<name>/conclusions.md
Writes: clients/<name>/output/report.html
        clients/<name>/output/Informe_Ejecutivo_arizon_<Client>.pdf
"""

import argparse
import json
import os
import re
import sys

# ===========================================================================
# CLI
# ===========================================================================
parser = argparse.ArgumentParser(description='arizon.ai PDF Report Generator')
parser.add_argument('--client', required=True, help='Client folder name (e.g. veoyoca)')
args = parser.parse_args()

CLIENT = args.client
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLIENT_DIR = os.path.join(BASE_DIR, 'clients', CLIENT)
CONCLUSIONS_PATH = os.path.join(CLIENT_DIR, 'conclusions.md')
OUTPUT_DIR = os.path.join(CLIENT_DIR, 'output')
ANALYSIS_DIR = os.path.join(CLIENT_DIR, 'analysis')

os.makedirs(OUTPUT_DIR, exist_ok=True)

if not os.path.exists(CONCLUSIONS_PATH):
    print(f"ERROR: Conclusions not found: {CONCLUSIONS_PATH}")
    print(f"Write your conclusions in markdown format at that path first.")
    sys.exit(1)

# Read conclusions
with open(CONCLUSIONS_PATH, 'r', encoding='utf-8') as f:
    md = f.read()

# Try to read metadata from analysis_results.json
metadata = {}
analysis_path = os.path.join(ANALYSIS_DIR, 'analysis_results.json')
if os.path.exists(analysis_path):
    with open(analysis_path, 'r', encoding='utf-8') as f:
        analysis = json.load(f)
    metadata = analysis.get('metadata', {})
    kpis = analysis.get('global_kpis', {})
else:
    kpis = {}

client_display = metadata.get('client', CLIENT).replace('-', ' ').replace('_', ' ').title()
period = metadata.get('report_period', 'N/A')
total_rows = kpis.get('total_rows', metadata.get('total_rows', 'N/A'))
total_spend = kpis.get('total_spend', 'N/A')
campaign_count = kpis.get('campaign_count', 'N/A')
total_columns = metadata.get('total_columns', 'N/A')

# ===========================================================================
# EMOJI STRIPPING
# ===========================================================================
emoji_map = {
    '🚀': '[ESCALAR]', '✅': '[OK]', '⛔': '[PARAR]', '⚠️': '[!]',
    '🏆': '[TOP]', '📌': '[NOTA]', '💡': '[TIP]', '❗': '[!]',
    '🔴': '[ALERTA]', '📄': '', '🌐': '', '📋': '',
    '🔶': '', '🟢': '>>>', '🟡': '>>', '—': '-',
    '→': '->', '←': '<-', '↔': '<->', '−': '-', '∞': 'infinito',
}
for emoji, replacement in emoji_map.items():
    md = md.replace(emoji, replacement)

md = re.sub(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF'
            r'\U0001F1E0-\U0001F1FF\U00002702-\U000027B0\U0001FA00-\U0001FA6F'
            r'\U0001FA70-\U0001FAFF\U00002600-\U000026FF\U0000FE0F]', '', md)


# ===========================================================================
# MARKDOWN PARSER
# ===========================================================================
def inline_format(text):
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)', r'<em>\1</em>', text)
    text = re.sub(r'`(.+?)`', r'<code>\1</code>', text)
    text = text.replace(' < ', ' &lt; ')
    text = text.replace(' > ', ' &gt; ')
    return text


def md_to_html(text):
    lines = text.split('\n')
    html_parts = []
    i = 0
    in_list = False

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            if in_list:
                html_parts.append(f'</{in_list}>')
                in_list = False
            i += 1
            continue

        if stripped == '---' or stripped == '***':
            if in_list:
                html_parts.append(f'</{in_list}>')
                in_list = False
            html_parts.append('<hr>')
            i += 1
            continue

        # Headers
        if stripped.startswith('#'):
            if in_list:
                html_parts.append(f'</{in_list}>')
                in_list = False
            level = len(stripped) - len(stripped.lstrip('#'))
            text_content = stripped.lstrip('#').strip()
            text_content = inline_format(text_content)
            html_parts.append(f'<h{level}>{text_content}</h{level}>')
            i += 1
            continue

        # GitHub alerts
        if stripped.startswith('> [!'):
            if in_list:
                html_parts.append(f'</{in_list}>')
                in_list = False
            alert_type = re.match(r'>\s*\[!(\w+)\]', stripped)
            if alert_type:
                atype = alert_type.group(1)
                labels = {'NOTE': 'NOTA', 'TIP': 'RECOMENDACION',
                          'IMPORTANT': 'IMPORTANTE', 'WARNING': 'ADVERTENCIA',
                          'CAUTION': 'ATENCION'}
                label = labels.get(atype, atype)
                content_lines = []
                i += 1
                while i < len(lines) and lines[i].strip().startswith('>'):
                    cl = lines[i].strip().lstrip('>').strip()
                    if cl:
                        content_lines.append(cl)
                    i += 1
                content = ' '.join(content_lines)
                content = inline_format(content)
                html_parts.append(
                    f'<div style="border-left:4px solid #333; background:#f5f5f5; '
                    f'padding:12px 16px; margin:14px 0;">'
                    f'<p style="margin:0 0 4px 0; font-weight:700; font-size:10px; '
                    f'color:#333; letter-spacing:1px;">{label}</p>'
                    f'<p style="margin:0; font-size:12px; color:#222;">{content}</p></div>')
                continue

        # Regular blockquote
        if stripped.startswith('>') and not stripped.startswith('> [!'):
            if in_list:
                html_parts.append(f'</{in_list}>')
                in_list = False
            content_lines = []
            while i < len(lines) and lines[i].strip().startswith('>'):
                cl = lines[i].strip().lstrip('>').strip()
                if cl:
                    content_lines.append(cl)
                i += 1
            content = ' '.join(content_lines)
            content = inline_format(content)
            html_parts.append(f'<blockquote><p>{content}</p></blockquote>')
            continue

        # Table
        if '|' in stripped and stripped.startswith('|'):
            if in_list:
                html_parts.append(f'</{in_list}>')
                in_list = False
            header_cells = [c.strip() for c in stripped.split('|')[1:-1]]
            i += 1
            if i < len(lines) and re.match(r'\|[\s\-:|]+\|', lines[i].strip()):
                i += 1
            data_rows = []
            while i < len(lines) and lines[i].strip().startswith('|') and lines[i].strip().endswith('|'):
                cells = [c.strip() for c in lines[i].strip().split('|')[1:-1]]
                data_rows.append(cells)
                i += 1
            html_parts.append('<table>')
            html_parts.append('<thead><tr>')
            for cell in header_cells:
                html_parts.append(f'<th>{inline_format(cell)}</th>')
            html_parts.append('</tr></thead>')
            html_parts.append('<tbody>')
            for row in data_rows:
                html_parts.append('<tr>')
                for cell in row:
                    html_parts.append(f'<td>{inline_format(cell)}</td>')
                for _ in range(len(header_cells) - len(row)):
                    html_parts.append('<td></td>')
                html_parts.append('</tr>')
            html_parts.append('</tbody></table>')
            continue

        # List items
        if stripped.startswith('- ') or stripped.startswith('* ') or re.match(r'^\d+\.\s', stripped):
            if not in_list:
                tag = 'ol' if re.match(r'^\d+\.', stripped) else 'ul'
                html_parts.append(f'<{tag}>')
                in_list = tag
            if stripped.startswith('- ') or stripped.startswith('* '):
                content = stripped[2:]
            else:
                content = re.sub(r'^\d+\.\s*', '', stripped)
            html_parts.append(f'<li>{inline_format(content)}</li>')
            i += 1
            continue

        # Paragraph
        if in_list:
            html_parts.append(f'</{in_list}>')
            in_list = False
        para_lines = [stripped]
        i += 1
        while i < len(lines):
            next_line = lines[i].strip()
            if (not next_line or next_line.startswith('#') or next_line.startswith('|') or
                next_line.startswith('>') or next_line.startswith('- ') or
                next_line.startswith('* ') or next_line == '---' or
                re.match(r'^\d+\.\s', next_line)):
                break
            para_lines.append(next_line)
            i += 1
        para_text = '<br>'.join(para_lines)
        para_text = inline_format(para_text)
        html_parts.append(f'<p>{para_text}</p>')

    if in_list:
        html_parts.append(f'</{in_list}>')
    return '\n'.join(html_parts)


html_body = md_to_html(md)

# ===========================================================================
# HTML DOCUMENT
# ===========================================================================
from datetime import datetime
today = datetime.now().strftime('%d de %B de %Y').replace('January', 'enero').replace(
    'February', 'febrero').replace('March', 'marzo').replace('April', 'abril').replace(
    'May', 'mayo').replace('June', 'junio').replace('July', 'julio').replace(
    'August', 'agosto').replace('September', 'septiembre').replace('October', 'octubre').replace(
    'November', 'noviembre').replace('December', 'diciembre')

html_doc = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe Ejecutivo arizon.ai - {client_display}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{
  font-family: 'Inter', Arial, Helvetica, sans-serif;
  color: #111;
  background: #fff;
  font-size: 12px;
  line-height: 1.55;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}}
.cover {{
  background: #fff;
  color: #000;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 60px 40px;
  page-break-after: always;
  border-bottom: 3px solid #000;
}}
.cover h1 {{
  font-size: 44px; font-weight: 900; letter-spacing: -2px;
  margin: 0 0 2px 0; padding: 0; border: none; color: #000;
}}
.cover .sub {{
  font-size: 12px; color: #666; letter-spacing: 4px;
  text-transform: uppercase; margin-bottom: 60px;
}}
.cover .badge {{
  border: 2px solid #000; padding: 6px 18px; font-size: 10px;
  color: #333; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 40px;
}}
.cover .title {{
  font-size: 34px; font-weight: 800; line-height: 1.2; margin-bottom: 10px; color: #000;
}}
.cover .divider {{ width: 50px; height: 2px; background: #000; margin: 20px auto; }}
.cover .client {{ font-size: 20px; font-weight: 600; color: #333; margin-bottom: 40px; }}
.cover .meta {{ font-size: 11px; color: #666; line-height: 2; }}
.content {{ max-width: 760px; margin: 0 auto; padding: 20px 35px; }}
.header {{
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 20px;
}}
.header .logo {{ font-size: 16px; font-weight: 900; color: #000; }}
.header .info {{ font-size: 9px; color: #999; text-align: right; }}
h1 {{ font-size: 18px; font-weight: 900; color: #000; margin: 28px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #000; }}
h2 {{ font-size: 14px; font-weight: 800; color: #000; margin: 24px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #ccc; }}
h3 {{ font-size: 12px; font-weight: 700; color: #222; margin: 14px 0 6px; }}
p {{ margin: 6px 0; color: #222; }}
strong {{ font-weight: 700; color: #000; }}
em {{ font-style: italic; color: #444; }}
code {{ background: #f0f0f0; padding: 1px 4px; font-size: 11px; }}
ul, ol {{ margin: 6px 0 6px 22px; }}
li {{ margin: 2px 0; }}
hr {{ border: none; border-top: 1px solid #ddd; margin: 20px 0; }}
blockquote {{ border-left: 3px solid #000; padding: 10px 14px; margin: 12px 0; background: #f7f7f7; }}
blockquote p {{ margin: 0; }}
table {{ width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10.5px; }}
thead {{ background: #000; }}
th {{ padding: 7px 8px; text-align: left; font-weight: 600; font-size: 9px; color: #fff; text-transform: uppercase; letter-spacing: 0.3px; border: 1px solid #333; }}
td {{ padding: 5px 8px; border: 1px solid #ddd; color: #222; }}
tr:nth-child(even) {{ background: #f8f8f8; }}
.footer {{ text-align: center; margin-top: 30px; padding-top: 12px; border-top: 2px solid #000; font-size: 9px; color: #999; line-height: 1.8; }}
.footer strong {{ color: #000; }}
@media print {{
  body {{ font-size: 10.5px; }}
  .cover {{ height: 100vh; }}
  .content {{ padding: 10px 20px; }}
  table {{ font-size: 9px; }}
  th {{ font-size: 8px; padding: 5px 6px; }}
  td {{ padding: 4px 6px; }}
  h1 {{ font-size: 15px; }}
  h2 {{ font-size: 12px; }}
  h3 {{ font-size: 10px; }}
}}
@page {{ size: A4; margin: 10mm 14mm; }}
</style>
</head>
<body>

<div class="cover">
  <h1 style="font-size:44px;border:none;padding:0;margin:0 0 2px 0;color:#000;">arizon.ai</h1>
  <div class="sub">Inteligencia de Marketing</div>
  <div class="badge">Informe Ejecutivo</div>
  <div class="title">Informe de Inteligencia<br>Publicitaria</div>
  <div class="divider"></div>
  <div class="client">{client_display}</div>
  <div class="meta">
    Meta Ads · Instagram · Messenger<br>
    Periodo: {period}<br>
    Inversión: ${total_spend} USD<br>
    <br>
    {today}
  </div>
</div>

<div class="content">
  <div class="header">
    <div class="logo">arizon.ai</div>
    <div class="info">Informe Ejecutivo - {client_display}<br>Meta Ads</div>
  </div>

  {html_body}

  <div class="footer">
    <strong>arizon.ai</strong> - Modulo de Inteligencia de Marketing<br>
    {datetime.now().year} arizon.ai - Todos los derechos reservados
  </div>
</div>

</body>
</html>"""

# Save HTML
OUTPUT_HTML = os.path.join(OUTPUT_DIR, 'report.html')
client_safe = CLIENT.replace('-', '_').replace(' ', '_').title()
OUTPUT_PDF = os.path.join(OUTPUT_DIR, f'Informe_Ejecutivo_arizon_{client_safe}.pdf')

with open(OUTPUT_HTML, 'w', encoding='utf-8') as f:
    f.write(html_doc)
print(f"OK HTML: {OUTPUT_HTML}")

# ===========================================================================
# PDF via Edge headless
# ===========================================================================
pdf_ok = False
try:
    from subprocess import run as sp_run
    for ep in [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ]:
        if os.path.exists(ep):
            html_uri = "file:///" + OUTPUT_HTML.replace("\\", "/")
            sp_run([ep, "--headless", "--disable-gpu",
                    f"--print-to-pdf={OUTPUT_PDF}",
                    "--no-pdf-header-footer", "--print-to-pdf-no-header",
                    html_uri], capture_output=True, text=True, timeout=30)
            if os.path.exists(OUTPUT_PDF) and os.path.getsize(OUTPUT_PDF) > 1000:
                pdf_ok = True
                print(f"OK PDF: {OUTPUT_PDF} ({os.path.getsize(OUTPUT_PDF)//1024} KB)")
            break
except Exception as e:
    print(f"Error: {e}")

if not pdf_ok:
    print("Open the HTML in browser and use Ctrl+P -> Save as PDF")
