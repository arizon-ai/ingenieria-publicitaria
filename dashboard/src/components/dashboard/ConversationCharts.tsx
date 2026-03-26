"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ConversationAnalysis } from "@/types/analysis"

interface ConversationChartsProps {
    data: ConversationAnalysis
}

export function ConversationCharts({ data }: ConversationChartsProps) {
    if (!data) return null;

    // Intent Data
    const intentData = data.intent_analysis ? data.intent_analysis.slice(0, 10) : [];

    // Sentiment Data
    const sentiment = data.sentiment?.distribution || { positive: 0, neutral: 0, negative: 0 };
    const sentimentData = [
        { name: 'Positivo', value: sentiment.positive, fill: '#000000' },
        { name: 'Neutral', value: sentiment.neutral, fill: '#666666' },
        { name: 'Negativo', value: sentiment.negative, fill: '#cccccc' },
    ]

    // Length Data
    const lengthData = (data.conversion_by_length || []).map(item => ({
        name: item.length,
        tasa: item.rate,
        total: item.total
    }))

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Intent Chart */}
            <Card className="col-span-1 border-black/10 shadow-none">
                <CardHeader>
                    <CardTitle>Intenciones Detectadas</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={intentData} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="intent" type="category" width={80} tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#000000" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Sentiment Chart */}
            <Card className="col-span-1 border-black/10 shadow-none">
                <CardHeader>
                    <CardTitle>Sentimiento de Usuarios</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sentimentData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {sentimentData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="text-center text-sm text-neutral-500 mt-2">
                        Polaridad Promedio: {data.sentiment?.avg_polarity?.toFixed(2) || "0.00"}
                    </div>
                </CardContent>
            </Card>

            {/* Length Conversion Chart */}
            <Card className="col-span-1 border-black/10 shadow-none">
                <CardHeader>
                    <CardTitle>Conversión por Longitud</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={lengthData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis unit="%" />
                                <Tooltip />
                                <Bar dataKey="tasa" name="Tasa Conv." fill="#000000" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
