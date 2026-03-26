"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type D = any

interface Props { data: D }

/** Safe number formatting — handles null, undefined, NaN */
const fmt = (v: unknown, decimals = 2): string => {
    if (v === null || v === undefined || Number.isNaN(v)) return "—"
    return Number(v).toFixed(decimals)
}

function ProductPerformance({ data }: { data: D[] }) {
    if (!data || data.length === 0) return null
    return (
        <Card className="border-black/10 shadow-none">
            <CardHeader><CardTitle>Rendimiento por Producto</CardTitle>
                <CardDescription>Categorías extraídas automáticamente de los nombres de campaña</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ left: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                            <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                            <YAxis dataKey="product" type="category" width={120} tick={{ fontSize: 11 }} interval={0} />
                            <Tooltip formatter={(v: number | undefined) => v !== undefined ? `$${fmt(v)}` : ''} />
                            <Bar dataKey="spend" fill="#000" radius={[0, 4, 4, 0]} name="Gasto Total" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <Table>
                    <TableHeader><TableRow>
                        <TableHead>Producto</TableHead><TableHead className="text-right">Gasto</TableHead>
                        <TableHead className="text-right">Resultados</TableHead><TableHead className="text-right">Costo/Res</TableHead>
                        <TableHead className="text-right">Camp.</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                        {data.map((p: D, i: number) => (
                            <TableRow key={i}>
                                <TableCell className="font-medium">{p.product}</TableCell>
                                <TableCell className="text-right text-xs">${fmt(p.spend)}</TableCell>
                                <TableCell className="text-right text-xs">{p.results ?? 0}</TableCell>
                                <TableCell className="text-right text-xs font-bold">${fmt(p.cpr ?? p.cost_per_result)}</TableCell>
                                <TableCell className="text-right text-xs">{p.campaigns ?? 0}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

function BudgetWaste({ data }: { data: D }) {
    if (!data) return null
    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-red-200 bg-red-50 shadow-none"><CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-red-700">${fmt(data.wasted_spend)}</div>
                    <p className="text-xs text-red-500">Presupuesto sin Resultados</p>
                </CardContent></Card>
                <Card className="border-black/10 shadow-none"><CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold">{fmt(data.waste_percentage)}%</div>
                    <p className="text-xs text-muted-foreground">del presupuesto total</p>
                </CardContent></Card>
                <Card className="border-black/10 shadow-none"><CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold">{data.rows_without_results ?? 0}</div>
                    <p className="text-xs text-muted-foreground">filas sin resultados</p>
                </CardContent></Card>
            </div>
            {data.by_campaign && data.by_campaign.length > 0 && (
                <Card className="border-black/10 shadow-none">
                    <CardHeader><CardTitle>Campañas con Mayor Desperdicio</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead className="w-[250px]">Campaña</TableHead>
                                <TableHead className="text-right">Gastado</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {data.by_campaign.map((c: D, i: number) => (
                                    <TableRow key={i}>
                                        <TableCell className="text-xs font-medium max-w-[250px] break-words">{c.campaign}</TableCell>
                                        <TableCell className="text-right text-xs font-bold text-red-600">${fmt(c.wasted)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
            {((data.by_product && data.by_product.length > 0) || (data.waste_by_product && data.waste_by_product.length > 0)) && (
                <Card className="border-black/10 shadow-none">
                    <CardHeader><CardTitle>Desperdicio por Producto</CardTitle></CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.by_product || data.waste_by_product} layout="vertical" margin={{ left: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                                    <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                                    <YAxis dataKey="product" type="category" width={120} tick={{ fontSize: 11 }} interval={0} />
                                    <Tooltip />
                                    <Bar dataKey="wasted" fill="#dc2626" radius={[0, 4, 4, 0]} name="Desperdicio" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            )}
            {data.wasted_spend === 0 && (
                <Card className="border-green-200 bg-green-50/50 shadow-none">
                    <CardContent className="pt-6 text-center">
                        <div className="text-lg font-semibold text-green-700">✅ Sin desperdicio detectado</div>
                        <p className="text-xs text-green-600 mt-1">Todas las filas generaron al menos un resultado</p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

function AdFatigue({ data }: { data: D }) {
    if (!data) return null
    const buckets = data.by_bucket || data.by_saturation || []
    return (
        <div className="space-y-4">
            {(data.avg_saturation || data.median_saturation) && (
                <div className="grid gap-4 md:grid-cols-2">
                    {data.avg_saturation && (
                        <Card className="border-black/10 shadow-none"><CardContent className="pt-6 text-center">
                            <div className="text-3xl font-bold">{fmt(data.avg_saturation)}x</div>
                            <p className="text-xs text-muted-foreground">Saturación Promedio</p>
                        </CardContent></Card>
                    )}
                    {data.median_saturation && (
                        <Card className="border-black/10 shadow-none"><CardContent className="pt-6 text-center">
                            <div className="text-3xl font-bold">{fmt(data.median_saturation)}x</div>
                            <p className="text-xs text-muted-foreground">Saturación Mediana</p>
                        </CardContent></Card>
                    )}
                </div>
            )}
            {buckets.length > 0 && (
                <Card className="border-black/10 shadow-none">
                    <CardHeader><CardTitle>Rendimiento por Nivel de Saturación</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Saturación</TableHead><TableHead className="text-right">CTR Prom.</TableHead>
                                <TableHead className="text-right">Gasto</TableHead>
                                <TableHead className="text-right">Resultados</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {buckets.map((b: D, i: number) => (
                                    <TableRow key={i}>
                                        <TableCell><Badge variant="outline">{b.bucket}</Badge></TableCell>
                                        <TableCell className="text-right text-xs">{fmt(b.ctr_avg ?? b.ctr)}%</TableCell>
                                        <TableCell className="text-right text-xs">${fmt(b.spend)}</TableCell>
                                        <TableCell className="text-right text-xs">{b.results ?? 0}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

function AnomaliesSection({ data }: { data: D }) {
    if (!data) return null
    const records = data.anomalous_records || data.anomalies || []
    if (records.length === 0) return null
    return (
        <Card className="border-black/10 shadow-none">
            <CardHeader>
                <CardTitle>Anomalías Detectadas (Isolation Forest)</CardTitle>
                <CardDescription>{data.total_anomalies} registros anómalos detectados</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow>
                        <TableHead className="w-[200px]">Campaña</TableHead>
                        <TableHead className="text-right">Gasto</TableHead><TableHead className="text-right">Resultados</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                        {records.slice(0, 15).map((a: D, i: number) => (
                            <TableRow key={i} className="bg-yellow-50/50">
                                <TableCell className="text-xs font-medium max-w-[200px] break-words">{a.campaign ?? '—'}</TableCell>
                                <TableCell className="text-right text-xs">${fmt(a.spend)}</TableCell>
                                <TableCell className="text-right text-xs">{a.results ?? 0}</TableCell>
                                <TableCell className="text-right text-xs font-bold">{fmt(a.anomaly_score ?? a.score, 4)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

function CombinationsSection({ best, worst }: { best: D[]; worst: D[] }) {
    if (!best && !worst) return null
    const renderTable = (items: D[], title: string, highlight: string) => (
        <Card className="border-black/10 shadow-none">
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow>
                        <TableHead>Producto</TableHead><TableHead>Edad</TableHead><TableHead>Género</TableHead>
                        <TableHead className="text-right">Costo/Res</TableHead><TableHead className="text-right">Gasto</TableHead>
                        <TableHead className="text-right">Resultados</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                        {items.slice(0, 10).map((c: D, i: number) => (
                            <TableRow key={i} className={i === 0 ? highlight : ''}>
                                <TableCell className="text-xs font-medium">{c.product}</TableCell>
                                <TableCell className="text-xs">{c.age}</TableCell>
                                <TableCell className="text-xs">{c.gender}</TableCell>
                                <TableCell className="text-right text-xs font-bold">${fmt(c.cost_per_result)}</TableCell>
                                <TableCell className="text-right text-xs">${fmt(c.spend)}</TableCell>
                                <TableCell className="text-right text-xs">{c.results ?? 0}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
    return (
        <div className="grid gap-4 md:grid-cols-2">
            {best && renderTable(best, "🏆 Mejores Combinaciones (Producto × Edad × Género)", "bg-green-50")}
            {worst && renderTable(worst, "⚠️ Peores Combinaciones", "bg-red-50")}
        </div>
    )
}

function BudgetOptimization({ data }: { data: D }) {
    if (!data) return null
    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-black/10 shadow-none"><CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold">{data.current_total_results ?? 0}</div>
                    <p className="text-xs text-muted-foreground">Resultados Actuales</p>
                </CardContent></Card>
                <Card className="border-green-200 bg-green-50 shadow-none"><CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-green-700">{data.projected_results_optimized ?? 0}</div>
                    <p className="text-xs text-green-600">Resultados Proyectados</p>
                </CardContent></Card>
                <Card className="border-green-200 bg-green-50 shadow-none"><CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-green-700">+{fmt(data.improvement_pct)}%</div>
                    <p className="text-xs text-green-600">Mejora Potencial</p>
                </CardContent></Card>
            </div>
            {data.top_increase && (
                <Card className="border-black/10 shadow-none">
                    <CardHeader><CardTitle>Campañas con Mayor Incremento Recomendado</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead className="w-[200px]">Campaña</TableHead>
                                <TableHead className="text-right">Presupuesto Actual</TableHead><TableHead className="text-right">Presup. Óptimo</TableHead>
                                <TableHead className="text-right">Cambio</TableHead><TableHead className="text-right">CPR</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {data.top_increase.map((c: D, i: number) => (
                                    <TableRow key={i}>
                                        <TableCell className="text-xs font-medium max-w-[200px] break-words">{c.campaign}</TableCell>
                                        <TableCell className="text-right text-xs">${fmt(c.current_budget)}</TableCell>
                                        <TableCell className="text-right text-xs font-bold">${fmt(c.optimal_budget)}</TableCell>
                                        <TableCell className="text-right text-xs">
                                            <Badge variant={c.change_pct > 0 ? "default" : "outline"} className={c.change_pct > 0 ? "bg-green-600" : "bg-red-100 text-red-700"}>
                                                {c.change_pct > 0 ? '+' : ''}{c.change_pct}%
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-xs">${fmt(c.cpr)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

function QualityRanking({ data }: { data: D }) {
    if (!data) return null
    const topItems = data.top_quality || data.by_product || []
    const worstItems = data.worst_quality || []
    if (topItems.length === 0 && worstItems.length === 0) return null

    const renderChart = (items: D[], title: string, color: string, altColor: string) => {
        if (!items || items.length === 0) return null
        const labelKey = items[0]?.product ? 'product' : 'campaign'
        const maxScore = Math.max(...items.map((i: D) => i.quality_score || 0))
        return (
            <Card className="border-black/10 shadow-none">
                <CardHeader><CardTitle>{title}</CardTitle>
                    <CardDescription>Basado en CTR y Tasa de Resultado normalizados</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={items.slice(0, 10)} layout="vertical" margin={{ left: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                                <XAxis type="number" domain={[0, Math.ceil(maxScore * 1.2)]} />
                                <YAxis dataKey={labelKey} type="category" width={180} tick={{ fontSize: 10 }} interval={0} />
                                <Tooltip />
                                <Bar dataKey="quality_score" radius={[0, 4, 4, 0]} name="Score">
                                    {items.slice(0, 10).map((_: D, i: number) => (
                                        <Cell key={i} fill={i < 3 ? color : altColor} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {renderChart(topItems, '🏆 Mejores Campañas por Calidad', '#000', '#999')}
            {renderChart(worstItems, '⚠️ Peores Campañas por Calidad', '#dc2626', '#f87171')}
        </div>
    )
}

function DiminishingReturns({ data }: { data: D[] }) {
    if (!data || data.length === 0) return null
    return (
        <Card className="border-black/10 shadow-none">
            <CardHeader><CardTitle>Rendimiento Decreciente</CardTitle>
                <CardDescription>¿Las campañas con mayor gasto mantienen su eficiencia?</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow>
                        <TableHead>Rango</TableHead><TableHead className="text-right">Costo/Resultado Prom.</TableHead>
                        <TableHead className="text-right">Eficiencia Prom.</TableHead><TableHead className="text-right">Campañas</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                        {data.map((d: D, i: number) => (
                            <TableRow key={i}>
                                <TableCell><Badge variant="outline">{d.quartile ?? d.bucket}</Badge></TableCell>
                                <TableCell className="text-right text-xs font-bold">${fmt(d.avg_cost_per_result ?? d.avg_cpr)}</TableCell>
                                <TableCell className="text-right text-xs">{fmt(d.avg_efficiency, 4)}</TableCell>
                                <TableCell className="text-right text-xs">{d.campaigns ?? 0}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

export function AdvancedAnalysisPanel({ data }: Props) {
    if (!data) return null
    return (
        <div className="space-y-8">
            {data.product_performance && (
                <section>
                    <h3 className="text-lg font-bold mb-3 border-b pb-2">🏷️ Rendimiento por Producto</h3>
                    <ProductPerformance data={data.product_performance} />
                </section>
            )}
            {data.budget_waste && (
                <section>
                    <h3 className="text-lg font-bold mb-3 border-b pb-2">🔥 Desperdicio de Presupuesto</h3>
                    <BudgetWaste data={data.budget_waste} />
                </section>
            )}
            {data.ad_fatigue && (
                <section>
                    <h3 className="text-lg font-bold mb-3 border-b pb-2">📉 Fatiga Publicitaria (Ad Fatigue)</h3>
                    <AdFatigue data={data.ad_fatigue} />
                </section>
            )}
            {(data.anomalies || data.anomaly_detection) && (
                <section>
                    <h3 className="text-lg font-bold mb-3 border-b pb-2">🔍 Detección de Anomalías</h3>
                    <AnomaliesSection data={data.anomalies ?? data.anomaly_detection} />
                </section>
            )}
            {(data.best_combinations || data.worst_combinations) && (
                <section>
                    <h3 className="text-lg font-bold mb-3 border-b pb-2">🎯 Mejores y Peores Combinaciones</h3>
                    <CombinationsSection best={data.best_combinations} worst={data.worst_combinations} />
                </section>
            )}
            {data.budget_optimization && (
                <section>
                    <h3 className="text-lg font-bold mb-3 border-b pb-2">💰 Simulador de Redistribución</h3>
                    <BudgetOptimization data={data.budget_optimization} />
                </section>
            )}
            {data.quality_ranking && (
                <section>
                    <h3 className="text-lg font-bold mb-3 border-b pb-2">⭐ Ranking de Calidad</h3>
                    <QualityRanking data={data.quality_ranking} />
                </section>
            )}
            {data.diminishing_returns && (
                <section>
                    <h3 className="text-lg font-bold mb-3 border-b pb-2">📊 Rendimiento Decreciente</h3>
                    <DiminishingReturns data={data.diminishing_returns} />
                </section>
            )}
            {data.campaign_keywords && data.campaign_keywords.length > 0 && (
                <section>
                    <h3 className="text-lg font-bold mb-3 border-b pb-2">🔑 Keywords de Campañas</h3>
                    <Card className="border-black/10 shadow-none">
                        <CardContent className="pt-6">
                            <div className="flex flex-wrap gap-2">
                                {data.campaign_keywords.map((kw: D, i: number) => (
                                    <Badge key={i} variant="outline" className="text-sm px-3 py-1">
                                        {kw.word} <span className="ml-1 text-muted-foreground">({kw.count})</span>
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </section>
            )}
        </div>
    )
}
