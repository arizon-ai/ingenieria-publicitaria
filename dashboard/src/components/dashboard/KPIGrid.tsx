import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlobalKPIs } from "@/types/analysis";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { DollarSign, Users, MousePointer, MessageSquare, TrendingUp, Activity } from "lucide-react";

interface KPIGridProps {
    data: GlobalKPIs;
}

export function KPIGrid({ data }: KPIGridProps) {
    const kpis = [
        {
            title: "Gasto Total",
            value: formatCurrency(data.total_spend),
            icon: DollarSign,
            desc: "Inversión acumulada",
        },
        {
            title: "Resultados Totales",
            value: formatNumber(data.total_results),
            icon: TrendingUp,
            desc: "Conversiones/Leads",
        },
        {
            title: "Alcance Total",
            value: formatNumber(data.total_reach),
            icon: Users,
            desc: "Usuarios únicos",
        },
        {
            title: "Costo por Resultado",
            value: formatCurrency(data.cost_per_result),
            icon: Activity,
            desc: "Promedio global",
        },
        {
            title: "CTR Promedio",
            value: formatPercent(data.avg_ctr), // formatPercent expects 0-100? No, usually 0.5. Wait implementation divides by 100
            icon: MousePointer,
            desc: "Click-Through Rate",
        },
        {
            title: "CPM Promedio",
            value: formatCurrency(data.avg_cpm),
            icon: DollarSign,
            desc: "Costo por 1k imp.",
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {kpis.map((kpi, i) => (
                <Card key={i} className="border-black/10 shadow-none hover:bg-neutral-50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {kpi.title}
                        </CardTitle>
                        <kpi.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpi.value}</div>
                        <p className="text-xs text-muted-foreground">
                            {kpi.desc}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
