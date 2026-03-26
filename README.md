# arizon.ai — Marketing Intelligence Pipeline

Plataforma de análisis de campañas publicitarias Meta Ads con dashboard interactivo y generación de reportes PDF con branding arizon.ai.

## Estructura

```
├── pipeline/                    # Scripts de análisis y generación
│   ├── analyze.py              # Análisis unificado (KPIs, campañas, demografía, etc.)
│   ├── generate_pdf.py         # Generador de PDF con branding arizon.ai
│   └── requirements.txt       # Dependencias Python
│
├── clients/                    # Carpeta por cliente
│   └── <nombre-cliente>/
│       ├── input/
│       │   ├── campaigns.csv           # Export CSV de Meta Ads
│       │   └── conversations.json      # JSON de conversaciones (opcional)
│       ├── analysis/                   # Generado automáticamente
│       │   ├── analysis_results.json
│       │   ├── deep_analysis.json
│       │   └── advanced_analysis.json
│       ├── conclusions.md              # Escrito manualmente por el analista
│       └── output/
│           ├── report.html
│           └── Informe_Ejecutivo_arizon_<Cliente>.pdf
│
├── dashboard/                  # Dashboard Next.js + shadcn/ui
│   ├── copy-client-data.js    # Sync de datos al dashboard
│   └── src/
│       ├── app/page.tsx       # Página principal con selector de cliente
│       └── components/dashboard/  # Paneles de visualización
```

## Workflow — Nuevo Cliente

### 1. Preparar datos
```bash
mkdir clients/nuevo-cliente/input
# Copiar CSV de Meta Ads → clients/nuevo-cliente/input/campaigns.csv
# Copiar JSON de conversaciones → clients/nuevo-cliente/input/conversations.json  (opcional)
```

### 2. Ejecutar análisis
```bash
python pipeline/analyze.py --client nuevo-cliente
```
Genera automáticamente `analysis_results.json`, `deep_analysis.json`, `advanced_analysis.json`.

### 3. Ver dashboard
```bash
cd dashboard
npm run sync               # Sincroniza datos al dashboard
npm run dev                # Abre en http://localhost:3000
```
Seleccionar cliente en el dropdown si hay más de uno.

### 4. Escribir conclusiones (manual)
Crear `clients/nuevo-cliente/conclusions.md` con el análisis experto en markdown.

### 5. Generar PDF
```bash
python pipeline/generate_pdf.py --client nuevo-cliente
```
Genera `clients/nuevo-cliente/output/Informe_Ejecutivo_arizon_Nuevo_Cliente.pdf`

## Notas Técnicas

- **Columnas variables:** El script `analyze.py` maneja diferentes nombres de columna de Meta Ads (inglés, español, variantes) mediante un sistema de alias.
- **Conversaciones opcionales:** El tab de chatbot solo aparece si existe `conversations.json`.
- **Conclusiones manuales:** El analista escribe las conclusiones en markdown. El PDF se genera a partir de ese archivo.
- **Branding:** blanco/negro con Inter font, portada limpia para impresión.
