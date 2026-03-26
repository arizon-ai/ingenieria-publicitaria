"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, FunnelChart as ReFunnel, Funnel, Cell, LabelList, LineChart, Line, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DeepData = any

interface DeepAnalysisPanelProps {
    data: DeepData
}

const GRAY_PALETTE = ['#000000', '#333333', '#555555', '#777777', '#999999', '#bbbbbb', '#dddddd']

function VideoRetentionSection({ data }: { data: DeepData }) {
    if (!data) return null

    const totals = data.totals || {}
    const rates = data.retention_rates || {}

    const funnelData = [
        { name: '25%', value: totals.video_25 || 0 },
        { name: '50%', value: totals.video_50 || 0 },
        { name: '75%', value: totals.video_75 || 0 },
        { name: '95%', value: totals.video_95 || 0 },
        { name: '100%', value: totals.video_100 || 0 },
    ]

    const retentionLine = [
        { step: '25%', pct: rates.video_25 ?? 100 },
        { step: '50%', pct: rates.video_50 ?? 0 },
        { step: '75%', pct: rates.video_75 ?? 0 },
        { step: '95%', pct: rates.video_95 ?? 0 },
        { step: '100%', pct: rates.video_100 ?? 0 },
    ]

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-black/10 shadow-none">
                    <CardHeader>
                        <CardTitle>Curva de Retención de Video</CardTitle>
                        <CardDescription>% de espectadores que llegan a cada punto del video</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={retentionLine}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="step" />
                                    <YAxis unit="%" domain={[0, 100]} />
                                    <Tooltip formatter={(v: number | undefined) => v !== undefined ? `${v}%` : ''} />
                                    <Line type="monotone" dataKey="pct" stroke="#000" strokeWidth={2} dot={{ fill: '#000', r: 5 }} name="Retención" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-black/10 shadow-none">
                    <CardHeader>
                        <CardTitle>Volumen por Punto de Retención</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={funnelData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#000" radius={[4, 4, 0, 0]} name="Reproducciones" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
            {data.avg_play_time && (
                <div className="grid gap-4 md:grid-cols-4">
                    {[
                        { label: 'Tiempo Promedio', value: `${data.avg_play_time.mean}s` },
                        { label: 'Mediana', value: `${data.avg_play_time.median}s` },
                        { label: 'Máximo', value: `${data.avg_play_time.max}s` },
                        { label: 'Retención al 100%', value: `${rates.video_100 ?? 0}%` },
                    ].map((m, i) => (
                        <Card key={i} className="border-black/10 shadow-none">
                            <CardContent className="pt-6 text-center">
                                <div className="text-2xl font-bold">{m.value}</div>
                                <p className="text-xs text-muted-foreground">{m.label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
            {data.by_campaign && (
                <Card className="border-black/10 shadow-none">
                    <CardHeader><CardTitle>Retención por Campaña (Top 15)</CardTitle></CardHeader>
                    <CardContent>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.by_campaign} layout="vertical" margin={{ left: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                                    <XAxis type="number" unit="%" />
                                    <YAxis dataKey="campaign" type="category" width={200} tick={{ fontSize: 10 }} interval={0} />
                                    <Tooltip />
                                    <Bar dataKey="retention_rate" fill="#000" radius={[0, 4, 4, 0]} name="Retención %" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

function FrequencySection({ data }: { data: DeepData }) {
    if (!data) return null
    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-black/10 shadow-none"><CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold">{data.avg_frequency ?? data.overall_avg_frequency ?? '—'}</div>
                    <p className="text-xs text-muted-foreground">Frecuencia Promedio</p>
                </CardContent></Card>
                <Card className="border-black/10 shadow-none"><CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold">{data.median_frequency ?? data.overall_median_frequency ?? '—'}</div>
                    <p className="text-xs text-muted-foreground">Frecuencia Mediana</p>
                </CardContent></Card>
                <Card className="border-black/10 shadow-none"><CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold">{data.optimal_bucket ?? data.optimal_frequency ?? '—'}</div>
                    <p className="text-xs text-muted-foreground">Rango Óptimo (menor costo/res.)</p>
                </CardContent></Card>
            </div>
            {data.by_bucket && (
                <Card className="border-black/10 shadow-none">
                    <CardHeader><CardTitle>Rendimiento por Rango de Frecuencia</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Frecuencia</TableHead><TableHead className="text-right">Gasto</TableHead>
                                    <TableHead className="text-right">Resultados</TableHead><TableHead className="text-right">Costo/Res</TableHead>
                                    <TableHead className="text-right">CTR Prom.</TableHead><TableHead className="text-right">Ad Sets</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.by_bucket.map((b: DeepData, i: number) => (
                                    <TableRow key={i}>
                                        <TableCell><Badge variant="outline">{b.bucket}</Badge></TableCell>
                                        <TableCell className="text-right text-xs">${(b.spend || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-right text-xs">{b.results || 0}</TableCell>
                                        <TableCell className="text-right text-xs font-semibold">${(b.cpr ?? b.cost_per_result ?? 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-right text-xs">{b.ctr_avg ? ((b.ctr_avg) * 100).toFixed(2) + '%' : '—'}</TableCell>
                                        <TableCell className="text-right text-xs">{b.rows ?? b.ad_sets ?? 0}</TableCell>
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

function MessagingSection({ data }: { data: DeepData }) {
    if (!data) return null
    const stats = data.cost_per_conversation
    return (
        <div className="space-y-4">
            {stats && (
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                    {[
                        { label: 'Costo Promedio', value: `$${stats.mean}` },
                        { label: 'Mediana', value: `$${stats.median}` },
                        { label: 'Percentil 10', value: `$${stats.p10}` },
                        { label: 'Percentil 90', value: `$${stats.p90}` },
                        { label: 'Mínimo', value: `$${stats.min}` },
                        { label: 'Máximo', value: `$${stats.max}` },
                    ].map((m, i) => (
                        <Card key={i} className="border-black/10 shadow-none"><CardContent className="pt-6 text-center">
                            <div className="text-xl font-bold">{m.value}</div>
                            <p className="text-xs text-muted-foreground">{m.label}</p>
                        </CardContent></Card>
                    ))}
                </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
                {data.by_age && (
                    <Card className="border-black/10 shadow-none">
                        <CardHeader><CardTitle>Costo por Conversación por Edad</CardTitle></CardHeader>
                        <CardContent>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.by_age}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="age" />
                                        <YAxis tickFormatter={(v) => `$${v}`} />
                                        <Tooltip formatter={(v: number | undefined) => v !== undefined ? `$${v.toFixed(4)}` : ''} />
                                        <Bar dataKey="avg_cost" fill="#000" radius={[4, 4, 0, 0]} name="Costo Prom." />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}
                {data.by_gender && (
                    <Card className="border-black/10 shadow-none">
                        <CardHeader><CardTitle>Costo por Conversación por Género</CardTitle></CardHeader>
                        <CardContent>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.by_gender}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="gender" />
                                        <YAxis tickFormatter={(v) => `$${v}`} />
                                        <Tooltip formatter={(v: number | undefined) => v !== undefined ? `$${v.toFixed(4)}` : ''} />
                                        <Bar dataKey="avg_cost" fill="#333" radius={[4, 4, 0, 0]} name="Costo Prom." />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
            {data.cheapest_campaigns && (
                <Card className="border-black/10 shadow-none">
                    <CardHeader><CardTitle>Campañas Más Económicas (Costo/Conversación)</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[300px]">Campaña</TableHead>
                                    <TableHead className="text-right">Costo/Conv</TableHead>
                                    <TableHead className="text-right">Gasto Total</TableHead>
                                    <TableHead className="text-right">Resultados</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.cheapest_campaigns.map((c: DeepData, i: number) => (
                                    <TableRow key={i}>
                                        <TableCell className="text-xs font-medium max-w-[300px] break-words">{c.campaign}</TableCell>
                                        <TableCell className="text-right text-xs font-bold">${c.avg_cost_per_conv.toFixed(4)}</TableCell>
                                        <TableCell className="text-right text-xs">${c.total_spend.toFixed(2)}</TableCell>
                                        <TableCell className="text-right text-xs">{c.results}</TableCell>
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

function CorrelationsSection({ data }: { data: DeepData[] }) {
    if (!data || data.length === 0) return null
    return (
        <Card className="border-black/10 shadow-none">
            <CardHeader>
                <CardTitle>Correlaciones Estadísticas (Pearson)</CardTitle>
                <CardDescription>p &lt; 0.05 = estadísticamente significativo</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Variable A</TableHead><TableHead>Variable B</TableHead>
                            <TableHead className="text-right">r</TableHead><TableHead className="text-right">p-value</TableHead>
                            <TableHead className="text-center">Significativo</TableHead><TableHead className="text-right">N</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((c: DeepData, i: number) => (
                            <TableRow key={i}>
                                <TableCell className="text-xs">{c.var_a}</TableCell>
                                <TableCell className="text-xs">{c.var_b}</TableCell>
                                <TableCell className="text-right text-xs font-bold">{c.pearson_r}</TableCell>
                                <TableCell className="text-right text-xs">{c.p_value}</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={c.significant ? "default" : "outline"} className={c.significant ? "bg-black text-white" : ""}>
                                        {c.significant ? 'Sí' : 'No'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right text-xs">{c.n}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

function ResultTypeSection({ data }: { data: DeepData[] }) {
    if (!data) return null
    return (
        <Card className="border-black/10 shadow-none">
            <CardHeader><CardTitle>Rendimiento por Tipo de Resultado</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tipo</TableHead><TableHead className="text-right">Gasto</TableHead>
                            <TableHead className="text-right">Resultados</TableHead><TableHead className="text-right">Costo/Res</TableHead>
                            <TableHead className="text-right">CPM</TableHead><TableHead className="text-right">CTR</TableHead>
                            <TableHead className="text-right">Freq.</TableHead><TableHead className="text-right">Campañas</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((r: DeepData, i: number) => (
                            <TableRow key={i}>
                                <TableCell className="text-xs font-medium">{r.type}</TableCell>
                                <TableCell className="text-right text-xs">${(r.spend || 0).toFixed(2)}</TableCell>
                                <TableCell className="text-right text-xs">{r.results || 0}</TableCell>
                                <TableCell className="text-right text-xs font-bold">${(r.cost_per_result || 0).toFixed(2)}</TableCell>
                                <TableCell className="text-right text-xs">${(r.cpm || 0).toFixed(2)}</TableCell>
                                <TableCell className="text-right text-xs">{((r.ctr_avg || 0) * 100).toFixed(2)}%</TableCell>
                                <TableCell className="text-right text-xs">{r.avg_frequency || 0}</TableCell>
                                <TableCell className="text-right text-xs">{r.campaigns || 0}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

function AgeGenderSection({ ageData, genderData }: { ageData: DeepData[]; genderData: DeepData[] }) {
    return (
        <div className="space-y-4">
            {genderData && (
                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="border-black/10 shadow-none">
                        <CardHeader><CardTitle>Comparación por Género</CardTitle></CardHeader>
                        <CardContent>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={genderData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="gender" />
                                        <YAxis tickFormatter={(v) => `$${v}`} />
                                        <Tooltip />
                                        <Bar dataKey="spend" fill="#000" name="Gasto" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-black/10 shadow-none">
                        <CardHeader><CardTitle>Costo por Resultado por Género</CardTitle></CardHeader>
                        <CardContent>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={genderData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="gender" />
                                        <YAxis tickFormatter={(v) => `$${v}`} />
                                        <Tooltip />
                                        <Bar dataKey="cost_per_result" fill="#555" name="Costo/Res" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
            {ageData && (
                <Card className="border-black/10 shadow-none">
                    <CardHeader><CardTitle>Rendimiento Completo por Edad</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Edad</TableHead><TableHead className="text-right">Gasto</TableHead>
                                    <TableHead className="text-right">Resultados</TableHead><TableHead className="text-right">Costo/Res</TableHead>
                                    <TableHead className="text-right">CTR</TableHead><TableHead className="text-right">CPC</TableHead>
                                    <TableHead className="text-right">CPM</TableHead><TableHead className="text-right">Comentarios</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ageData.map((a: DeepData, i: number) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{a.age}</TableCell>
                                        <TableCell className="text-right text-xs">${(a.spend || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-right text-xs">{a.results || 0}</TableCell>
                                        <TableCell className="text-right text-xs font-bold">${(a.cost_per_result || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-right text-xs">{((a.ctr_avg || 0) * 100).toFixed(2)}%</TableCell>
                                        <TableCell className="text-right text-xs">${(a.cpc || 0).toFixed(4)}</TableCell>
                                        <TableCell className="text-right text-xs">${(a.cpm || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-right text-xs">{a.comments || 0}</TableCell>
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

export function DeepAnalysisPanel({ data }: DeepAnalysisPanelProps) {
    if (!data) return null
    return (
        <div className="space-y-8">
            {/* Video */}
            {data.video_retention && (
                <section>
                    <h3 className="text-lg font-bold mb-3 border-b pb-2">📹 Retención de Video</h3>
                    <VideoRetentionSection data={data.video_retention} />
                </section>
            )}

            {/* Frequency */}
            {data.frequency_optimization && (
                <section>
                    <h3 className="text-lg font-bold mb-3 border-b pb-2">🔄 Optimización de Frecuencia</h3>
                    <FrequencySection data={data.frequency_optimization} />
                </section>
            )}

            {/* Result Type */}
            {data.result_type_performance && (
                <section>
                    <h3 className="text-lg font-bold mb-3 border-b pb-2">🎯 Rendimiento por Tipo de Resultado</h3>
                    <ResultTypeSection data={data.result_type_performance} />
                </section>
            )}

            {/* Messaging */}
            {data.messaging_analysis && (
                <section>
                    <h3 className="text-lg font-bold mb-3 border-b pb-2">💬 Análisis de Costos de Mensajería</h3>
                    <MessagingSection data={data.messaging_analysis} />
                </section>
            )}

            {/* Age/Gender */}
            {(data.age_performance || data.gender_performance) && (
                <section>
                    <h3 className="text-lg font-bold mb-3 border-b pb-2">👥 Rendimiento Edad y Género</h3>
                    <AgeGenderSection ageData={data.age_performance} genderData={data.gender_performance} />
                </section>
            )}

            {/* Correlations */}
            {data.correlations && data.correlations.length > 0 && (
                <section>
                    <h3 className="text-lg font-bold mb-3 border-b pb-2">📊 Correlaciones Estadísticas</h3>
                    <CorrelationsSection data={data.correlations} />
                </section>
            )}

            {/* Engagement (from engagement key in JSON) */}
            {data.engagement && (
                <section>
                    <h3 className="text-lg font-bold mb-3 border-b pb-2">💬 Engagement</h3>
                    <Card className="border-black/10 shadow-none">
                        <CardContent className="pt-6">
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="text-center">
                                    <div className="text-3xl font-bold">{data.engagement.total_comments?.toLocaleString()}</div>
                                    <p className="text-xs text-muted-foreground">Comentarios Totales</p>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold">{data.engagement.avg_comments?.toFixed(1)}</div>
                                    <p className="text-xs text-muted-foreground">Promedio por Campaña</p>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold">{data.engagement.top_campaigns?.length || 0}</div>
                                    <p className="text-xs text-muted-foreground">Top Campañas</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            )}

            {/* Campaign Ranking (from campaign_ranking key in JSON) */}
            {data.campaign_ranking && (
                <section>
                    <h3 className="text-lg font-bold mb-3 border-b pb-2">🏆 Ranking de Campañas</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        {data.campaign_ranking.top && (
                            <Card className="border-black/10 shadow-none">
                                <CardHeader><CardTitle className="text-green-700">✅ Mejores Campañas</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {data.campaign_ranking.top.map((c: DeepData, i: number) => (
                                            <div key={i} className="flex justify-between text-sm border-b pb-1">
                                                <span className="max-w-[200px] truncate">{c.campaign}</span>
                                                <span className="font-bold">${c.spend?.toFixed(2)} · {c.results} res</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        {data.campaign_ranking.bottom && (
                            <Card className="border-black/10 shadow-none">
                                <CardHeader><CardTitle className="text-red-700">⚠️ Campañas a Revisar</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {data.campaign_ranking.bottom.map((c: DeepData, i: number) => (
                                            <div key={i} className="flex justify-between text-sm border-b pb-1">
                                                <span className="max-w-[200px] truncate">{c.campaign}</span>
                                                <span className="font-bold">${c.spend?.toFixed(2)} · {c.results} res</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </section>
            )}
        </div>
    )
}
