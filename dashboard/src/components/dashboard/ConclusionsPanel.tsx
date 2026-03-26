"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type D = any

interface Props { data: D }

function severityColor(s: string) {
    switch (s) {
        case 'critical': return 'bg-red-600 text-white'
        case 'high': return 'bg-orange-500 text-white'
        case 'medium': return 'bg-yellow-500 text-black'
        default: return 'bg-gray-400 text-white'
    }
}
function severityLabel(s: string) {
    switch (s) {
        case 'critical': return 'CRÍTICO'
        case 'high': return 'ALTO'
        case 'medium': return 'MEDIO'
        default: return 'INFO'
    }
}
function verdictColor(v: string) {
    if (v === 'Escalar') return 'bg-green-100 text-green-800 border-green-300'
    if (v === 'Mantener') return 'bg-blue-100 text-blue-800 border-blue-300'
    return 'bg-red-100 text-red-800 border-red-300'
}

function ExecutiveDiagnosis({ data }: { data: D }) {
    if (!data) return null
    const cards = [
        { label: 'Inversión Total', value: `$${data.total_investment.toLocaleString()}`, sub: 'USD' },
        { label: 'Resultados Totales', value: data.total_results.toLocaleString(), sub: 'conversiones' },
        { label: 'Costo por Resultado', value: `$${data.global_cost_per_result}`, sub: 'promedio global' },
        { label: 'Alcance Total', value: data.total_reach.toLocaleString(), sub: 'personas únicas' },
        { label: 'Campañas Únicas', value: data.unique_campaigns, sub: 'ejecutadas' },
        { label: 'CTR Promedio', value: `${data.avg_ctr}%`, sub: 'todos los tipos' },
        { label: 'CPM Promedio', value: `$${data.avg_cpm}`, sub: 'por 1,000 imp.' },
        { label: 'Frecuencia Media', value: `${data.avg_frequency}x`, sub: 'imp. por persona' },
        { label: 'Leads del Chatbot', value: data.chatbot_leads, sub: 'capturados' },
        { label: 'Conversión Chatbot', value: `${data.chatbot_conversion_rate}%`, sub: 'tasa completa' },
        { label: 'Costo por Lead Calificado', value: `$${data.cost_per_qualified_lead}`, sub: 'estimado' },
    ]
    return (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {cards.map((c, i) => (
                <Card key={i} className="border-black/10 shadow-none">
                    <CardContent className="pt-4 pb-3 text-center">
                        <div className="text-2xl font-bold tracking-tight">{c.value}</div>
                        <p className="text-xs font-medium text-black/70 mt-1">{c.label}</p>
                        <p className="text-[10px] text-muted-foreground">{c.sub}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function CriticalFindings({ data }: { data: D[] }) {
    if (!data) return null
    return (
        <div className="space-y-4">
            {data.map((f: D, i: number) => (
                <Card key={i} className={`border-l-4 shadow-none ${f.severity === 'critical' ? 'border-l-red-600 bg-red-50/40' : f.severity === 'high' ? 'border-l-orange-500 bg-orange-50/30' : f.severity === 'medium' ? 'border-l-yellow-500 bg-yellow-50/30' : 'border-l-gray-400'}`}>
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-start gap-3">
                            <Badge className={`${severityColor(f.severity)} text-[10px] font-bold shrink-0 mt-0.5`}>
                                {severityLabel(f.severity)}
                            </Badge>
                            <div className="space-y-2 min-w-0">
                                <div>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{f.category}</span>
                                    <h4 className="text-sm font-bold leading-tight">{f.title}</h4>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{f.detail}</p>
                                <div className="bg-white/80 border rounded-md p-2.5 mt-2">
                                    <p className="text-xs"><span className="font-bold text-black">Acción: </span>{f.action}</p>
                                    <p className="text-xs mt-1"><span className="font-bold text-green-700">Impacto: </span>{f.impact}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function ProductStrategy({ data }: { data: D[] }) {
    if (!data) return null
    return (
        <Card className="border-black/10 shadow-none">
            <CardHeader>
                <CardTitle>Estrategia por Producto</CardTitle>
                <CardDescription>Veredicto basado en comparación con el CPR global promedio</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Gasto</TableHead>
                        <TableHead className="text-right">Resultados</TableHead>
                        <TableHead className="text-right">CPR</TableHead>
                        <TableHead className="text-right">CTR</TableHead>
                        <TableHead className="text-right">Quality</TableHead>
                        <TableHead className="text-center">Veredicto</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                        {data.map((p: D, i: number) => (
                            <TableRow key={i}>
                                <TableCell className="font-bold text-sm">{p.product}</TableCell>
                                <TableCell className="text-right text-xs">${p.spend.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-xs">{p.results.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-xs font-bold">${p.cost_per_result.toFixed(2)}</TableCell>
                                <TableCell className="text-right text-xs">{p.ctr.toFixed(2)}%</TableCell>
                                <TableCell className="text-right text-xs">{p.quality_score}/100</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline" className={`text-[10px] ${verdictColor(p.verdict)}`}>
                                        {p.verdict === 'Escalar' ? '🚀' : p.verdict === 'Mantener' ? '✅' : '⚠️'} {p.verdict}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

function DemographicStrategy({ data }: { data: D }) {
    if (!data) return null
    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-green-200 bg-green-50/30 shadow-none">
                <CardHeader><CardTitle className="text-green-800 text-base">✅ Segmentos a Escalar</CardTitle></CardHeader>
                <CardContent>
                    {data.best_segments.map((s: D, i: number) => (
                        <div key={i} className="flex justify-between items-center py-1.5 border-b border-green-100 last:border-0">
                            <span className="text-xs font-medium">{s.product} · {s.age} · {s.gender}</span>
                            <Badge variant="outline" className="bg-green-100 text-green-800 text-[10px]">${s.cost_per_result}/res</Badge>
                        </div>
                    ))}
                </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50/30 shadow-none">
                <CardHeader><CardTitle className="text-red-800 text-base">⛔ Segmentos a Reducir</CardTitle></CardHeader>
                <CardContent>
                    {data.worst_segments.map((s: D, i: number) => (
                        <div key={i} className="flex justify-between items-center py-1.5 border-b border-red-100 last:border-0">
                            <span className="text-xs font-medium">{s.product} · {s.age} · {s.gender}</span>
                            <Badge variant="outline" className="bg-red-100 text-red-800 text-[10px]">${s.cost_per_result}/res</Badge>
                        </div>
                    ))}
                    <p className="text-[10px] text-muted-foreground mt-3">{data.recommendation}</p>
                </CardContent>
            </Card>
        </div>
    )
}

function ResultTypeStrategy({ data }: { data: D[] }) {
    if (!data) return null
    return (
        <Card className="border-black/10 shadow-none">
            <CardHeader><CardTitle>Estrategia por Tipo de Resultado</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow>
                        <TableHead>Tipo</TableHead><TableHead className="text-right">Gasto</TableHead>
                        <TableHead className="text-right">Resultados</TableHead><TableHead className="text-right">CPR</TableHead>
                        <TableHead className="text-right">CPM</TableHead><TableHead className="text-center">Veredicto</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                        {data.map((r: D, i: number) => (
                            <TableRow key={i} className={r.verdict === 'Mejor opción' ? 'bg-green-50' : ''}>
                                <TableCell className="font-medium text-xs">{r.type}</TableCell>
                                <TableCell className="text-right text-xs">${r.spend.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-xs">{r.results.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-xs font-bold">${r.cost_per_result.toFixed(2)}</TableCell>
                                <TableCell className="text-right text-xs">${r.cpm.toFixed(2)}</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline" className={r.verdict === 'Mejor opción' ? 'bg-green-100 text-green-800' : ''}>
                                        {r.verdict === 'Mejor opción' ? '🏆' : '📊'} {r.verdict}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

function ActionPlan({ data }: { data: D }) {
    if (!data) return null
    const sections = [
        { key: 'immediate', icon: '🔴', title: 'Inmediato (Esta Semana)', color: 'border-l-red-500 bg-red-50/20' },
        { key: 'short_term', icon: '🟡', title: 'Corto Plazo (1-4 Semanas)', color: 'border-l-yellow-500 bg-yellow-50/20' },
        { key: 'medium_term', icon: '🟢', title: 'Mediano Plazo (1-3 Meses)', color: 'border-l-green-500 bg-green-50/20' },
    ]
    return (
        <div className="space-y-4">
            {sections.map((s) => (
                <Card key={s.key} className={`border-l-4 shadow-none ${s.color}`}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">{s.icon} {s.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {(data[s.key] || []).map((action: string, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-xs mt-0.5 shrink-0">▸</span>
                                    <span className="text-xs leading-relaxed">{action}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function WastedCampaigns({ data }: { data: D[] }) {
    if (!data) return null
    return (
        <Card className="border-red-200 shadow-none">
            <CardHeader><CardTitle className="text-red-700">Campañas con Mayor Gasto Desperdiciado</CardTitle>
                <CardDescription>Campañas que consumieron presupuesto sin generar resultados medibles</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow>
                        <TableHead className="w-[280px]">Campaña</TableHead>
                        <TableHead className="text-right">Gasto Sin Resultado</TableHead>
                        <TableHead className="text-right">Alcance</TableHead>
                        <TableHead className="text-right">Impresiones</TableHead>
                        <TableHead className="text-right">Clicks</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                        {data.map((c: D, i: number) => (
                            <TableRow key={i} className={i < 3 ? 'bg-red-50/50' : ''}>
                                <TableCell className="text-xs font-medium max-w-[280px] break-words">{c.campaign}</TableCell>
                                <TableCell className="text-right text-xs font-bold text-red-600">${c.wasted.toFixed(2)}</TableCell>
                                <TableCell className="text-right text-xs">{c.reach.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-xs">{c.impressions.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-xs">{c.clicks}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

export function ConclusionsPanel({ data }: Props) {
    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="text-center border-b pb-6">
                <h2 className="text-2xl font-bold tracking-tight">Conclusiones & Recomendaciones</h2>
                <p className="text-sm text-muted-foreground mt-1">Análisis profundo basado en las 46 columnas del reporte Meta Ads 2025-2026</p>
            </div>

            {/* 1. Executive Diagnosis */}
            <section>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="bg-black text-white rounded-full w-7 h-7 flex items-center justify-center text-xs">1</span>
                    Diagnóstico Ejecutivo
                </h3>
                <ExecutiveDiagnosis data={data.executive_diagnosis} />
            </section>

            {/* 2. Critical Findings */}
            <section>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="bg-black text-white rounded-full w-7 h-7 flex items-center justify-center text-xs">2</span>
                    Hallazgos Críticos
                </h3>
                <CriticalFindings data={data.critical_findings} />
            </section>

            {/* 3. Product Strategy */}
            <section>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="bg-black text-white rounded-full w-7 h-7 flex items-center justify-center text-xs">3</span>
                    Estrategia por Producto
                </h3>
                <ProductStrategy data={data.product_strategy} />
            </section>

            {/* 4. Demographic Strategy */}
            <section>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="bg-black text-white rounded-full w-7 h-7 flex items-center justify-center text-xs">4</span>
                    Estrategia Demográfica
                </h3>
                <DemographicStrategy data={data.demographic_strategy} />
            </section>

            {/* 5. Result Type Strategy */}
            <section>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="bg-black text-white rounded-full w-7 h-7 flex items-center justify-center text-xs">5</span>
                    Estrategia por Tipo de Resultado
                </h3>
                <ResultTypeStrategy data={data.result_type_strategy} />
            </section>

            {/* 6. Wasted Campaigns */}
            <section>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="bg-black text-white rounded-full w-7 h-7 flex items-center justify-center text-xs">6</span>
                    Campañas con Desperdicio
                </h3>
                <WastedCampaigns data={data.wasted_campaigns} />
            </section>

            {/* 7. Action Plan */}
            <section>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="bg-black text-white rounded-full w-7 h-7 flex items-center justify-center text-xs">7</span>
                    Plan de Acción
                </h3>
                <ActionPlan data={data.action_plan} />
            </section>

            {/* Footer */}
            <div className="text-center border-t pt-6 pb-2">
                <p className="text-xs text-muted-foreground">Reporte generado automáticamente a partir del análisis exhaustivo de {data.executive_diagnosis?.unique_campaigns || '—'} campañas.</p>
                <p className="text-xs text-muted-foreground">Datos: Meta Ads Manager · Período: 2025-2026 · Veo & Oca</p>
            </div>
        </div>
    )
}
