"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DemographicData } from "@/types/analysis"
import { formatCurrency } from "@/lib/format"

interface DemographicsChartProps {
    data: DemographicData[]
}

export function DemographicsChart({ data }: DemographicsChartProps) {
    // Handle two possible input formats:
    // 1. Pre-pivoted (from heatmap_spend): [{age: '18-24', female: 5.88, male: 2.12, unknown: 0.02}, ...]
    // 2. Flat list: [{age: '18-24', gender: 'male', value: 100}, ...]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstItem = data[0] as any
    const isPrePivoted = firstItem && ('female' in firstItem || 'male' in firstItem)

    const processedData = isPrePivoted
        // Already pivoted — use directly
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (data as any[]).map(item => ({
            age: item.age,
            female: item.female || 0,
            male: item.male || 0,
            unknown: item.unknown || 0,
        }))
        // Flat format — pivot it
        : data.reduce<Array<{ age: string;[key: string]: string | number }>>((acc, curr) => {
            const existing = acc.find(item => item.age === curr.age)
            if (existing) {
                existing[curr.gender || 'unknown'] = curr.value || 0
            } else {
                acc.push({
                    age: curr.age,
                    [curr.gender || 'unknown']: curr.value || 0
                })
            }
            return acc
        }, [])

    return (
        <Card className="col-span-1 border-black/10 shadow-none">
            <CardHeader>
                <CardTitle>Gasto por Edad y Género</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={processedData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="age" />
                            <YAxis tickFormatter={(val) => `$${val}`} />
                            <Tooltip formatter={(val: number | undefined) => val !== undefined ? formatCurrency(val) : ''} />
                            <Legend />
                            <Bar dataKey="female" name="Mujeres" fill="#000000" stackId="a" />
                            <Bar dataKey="male" name="Hombres" fill="#666666" stackId="a" />
                            <Bar dataKey="unknown" name="Desconocido" fill="#cccccc" stackId="a" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
