"use client"

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Campaign } from "@/types/analysis"
import { formatCurrency, formatNumber } from "@/lib/format"

interface ScatterEfficiencyProps {
    campaigns: Campaign[]
}

export function ScatterEfficiency({ campaigns }: ScatterEfficiencyProps) {
    // Filter out extreme outliers for better visualization if needed, or keeping all
    // Let's take top 50 by spend to avoid noise
    const data = campaigns
        .slice(0, 50)
        .map(c => ({
            name: c.campaign,
            spend: c.spend,
            results: c.results,
            cpr: c.cost_per_result
        }))

    return (
        <Card className="col-span-1 border-black/10 shadow-none">
            <CardHeader>
                <CardTitle>Eficiencia: Gasto vs Resultados</CardTitle>
                <CardDescription>
                    Cada punto es una campaña. Más arriba = más resultados. Más a la derecha = más gasto.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                type="number"
                                dataKey="spend"
                                name="Gasto"
                                unit="$"
                                tickFormatter={(val) => `$${val}`}
                                label={{ value: 'Gasto Total', position: 'insideBottom', offset: -10 }}
                            />
                            <YAxis
                                type="number"
                                dataKey="results"
                                name="Resultados"
                                label={{ value: 'Total Resultados', angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload
                                        return (
                                            <div className="bg-white border border-neutral-200 p-2 rounded shadow text-xs">
                                                <p className="font-bold mb-1">{data.name}</p>
                                                <p>Gasto: {formatCurrency(data.spend)}</p>
                                                <p>Resultados: {data.results}</p>
                                                <p>Costo/Res: {formatCurrency(data.cpr)}</p>
                                            </div>
                                        )
                                    }
                                    return null
                                }}
                            />
                            <Scatter name="Campañas" data={data} fill="#000000" />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
