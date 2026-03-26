"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ConversationAnalysis } from "@/types/analysis"

interface FunnelChartProps {
    data: ConversationAnalysis['lead_funnel']
}

export function FunnelChart({ data }: FunnelChartProps) {
    if (!data) return null;
    const chartData = data.funnel_steps.map((step) => ({
        name: step.step,
        count: step.count,
        pct: step.pct,
    }))

    return (
        <Card className="col-span-1 border-black/10 shadow-none">
            <CardHeader>
                <CardTitle>Embudo de Leads (Chatbot)</CardTitle>
                <CardDescription>
                    Tasa final de captura: {data.conversion_rate_complete}%
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={150}
                                tick={{ fontSize: 12 }}
                                interval={0}
                            />
                            <Tooltip
                                formatter={(val: number | undefined) => [val, 'Usuarios']}
                                labelStyle={{ color: 'black' }}
                            />
                            <Bar dataKey="count" fill="#000000" radius={[0, 4, 4, 0]}>
                                <LabelList dataKey="count" position="right" />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
