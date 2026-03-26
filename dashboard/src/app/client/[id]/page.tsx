"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { KPIGrid } from "@/components/dashboard/KPIGrid";
import { CampaignTable } from "@/components/dashboard/CampaignTable";
import { DemographicsChart } from "@/components/dashboard/DemographicsChart";
import { ScatterEfficiency } from "@/components/dashboard/ScatterEfficiency";
import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { ConversationCharts } from "@/components/dashboard/ConversationCharts";
import { DeepAnalysisPanel } from "@/components/dashboard/DeepAnalysisPanel";
import { AdvancedAnalysisPanel } from "@/components/dashboard/AdvancedAnalysisPanel";
import { CreativeAnalysisPanel } from "@/components/dashboard/CreativeAnalysisPanel";
import { ConclusionsPanel } from "@/components/dashboard/ConclusionsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any;

export default function ClientReportPage() {
    const params = useParams();
    const router = useRouter();
    const clientId = params.id as string;

    const [analysisData, setAnalysisData] = useState<AnyData>(null);
    const [deepData, setDeepData] = useState<AnyData>(null);
    const [advancedData, setAdvancedData] = useState<AnyData>(null);
    const [conclusionsData, setConclusionsData] = useState<AnyData>(null);
    const [creativeData, setCreativeData] = useState<AnyData>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!clientId) return;

        const basePath = `/data/${clientId}`;

        const safeFetch = async (url: string) => {
            try {
                const r = await fetch(url);
                if (!r.ok) return null;
                return await r.json();
            } catch {
                return null;
            }
        };

        Promise.all([
            safeFetch(`${basePath}/analysis_results.json`),
            safeFetch(`${basePath}/deep_analysis.json`),
            safeFetch(`${basePath}/advanced_analysis.json`),
            safeFetch(`${basePath}/conclusions.json`),
            safeFetch(`${basePath}/creative_analysis.json`),
        ])
            .then(([analysis, deep, advanced, conclusions, creative]) => {
                if (!analysis) {
                    setError(`No se pudo cargar el análisis para "${clientId}".`);
                    setLoading(false);
                    return;
                }
                setAnalysisData(analysis);
                setDeepData(deep);
                setAdvancedData(advanced);
                setConclusionsData(conclusions);
                setCreativeData(creative);
                setLoading(false);
            })
            .catch(() => {
                setError(`Error cargando datos para ${clientId}`);
                setLoading(false);
            });
    }, [clientId]);

    if (error) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold">arizon.ai Intelligence</h1>
                    <p className="text-neutral-500">{error}</p>
                    <Button variant="outline" onClick={() => router.push("/")}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Volver
                    </Button>
                </div>
            </div>
        );
    }

    if (loading || !analysisData) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold tracking-tight">arizon.ai</h1>
                    <div className="animate-pulse flex flex-col items-center gap-2">
                        <div className="h-2 w-48 bg-neutral-200 rounded"></div>
                        <div className="h-2 w-32 bg-neutral-100 rounded"></div>
                    </div>
                    <p className="text-sm text-neutral-400">Cargando análisis de {clientId}...</p>
                </div>
            </div>
        );
    }

    const data = analysisData;
    const clientName = clientId.charAt(0).toUpperCase() + clientId.slice(1);
    const hasConversations = data.conversation_analysis?.has_data;
    const tabTriggerClass = "data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm";

    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
            {/* Header */}
            <header className="border-b border-neutral-200 bg-white sticky top-0 z-50 backdrop-blur-sm bg-white/80">
                <div className="container mx-auto py-4 px-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push("/")}
                            className="text-neutral-500 hover:text-black"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" /> Clientes
                        </Button>
                        <div className="border-l border-neutral-200 pl-4">
                            <h1 className="text-2xl font-bold tracking-tight">{clientName}</h1>
                            <p className="text-sm text-neutral-500">Reporte Gerencial de Marketing y Ventas</p>
                        </div>
                    </div>
                    <div className="text-right text-xs text-neutral-400">
                        <p>Periodo: {data.metadata?.report_period || "N/A"}</p>
                        <p>Generado: {data.metadata?.generated_at ? new Date(data.metadata.generated_at).toLocaleDateString() : "N/A"}</p>
                    </div>
                </div>
            </header>

            <main className="container mx-auto py-8 px-4 space-y-8">
                {/* Executive Summary */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">Resumen Ejecutivo</h2>
                    </div>
                    <KPIGrid data={data.global_kpis} />
                </section>

                {/* Main Tabs */}
                <Tabs defaultValue="campaigns" className="space-y-4">
                    <TabsList className="bg-neutral-100 text-neutral-500 border border-neutral-200 h-10 flex-wrap">
                        <TabsTrigger value="campaigns" className={tabTriggerClass}>Rendimiento Campañas</TabsTrigger>
                        {creativeData && <TabsTrigger value="creatives" className={tabTriggerClass}>🎨 Creativos</TabsTrigger>}
                        {hasConversations && (
                            <TabsTrigger value="conversations" className={tabTriggerClass}>Chatbot &amp; Conversaciones</TabsTrigger>
                        )}
                        <TabsTrigger value="demographics" className={tabTriggerClass}>Demografía &amp; Audiencia</TabsTrigger>
                        <TabsTrigger value="efficiency" className={tabTriggerClass}>Eficiencia &amp; ROI</TabsTrigger>
                        {deepData && <TabsTrigger value="deep" className={tabTriggerClass}>Deep Dive</TabsTrigger>}
                        {advancedData && <TabsTrigger value="advanced" className={tabTriggerClass}>Insights Avanzados</TabsTrigger>}
                        {conclusionsData && <TabsTrigger value="conclusions" className={tabTriggerClass}>📋 Conclusiones</TabsTrigger>}
                    </TabsList>

                    {/* CAMPAIGNS TAB */}
                    <TabsContent value="campaigns" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                            <Card className="col-span-4 border-black/10 shadow-none">
                                <CardHeader>
                                    <CardTitle>Top Campañas por Gasto</CardTitle>
                                </CardHeader>
                                <CardContent className="pl-2">
                                    <CampaignTable campaigns={data.campaign_performance?.top_campaigns || []} title="Top 10 Campañas" />
                                </CardContent>
                            </Card>
                            <Card className="col-span-3 border-black/10 shadow-none">
                                <CardHeader>
                                    <CardTitle>Pareto (80/20)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center py-8">
                                        <div className="text-5xl font-bold mb-2">{data.campaign_performance?.pareto?.campaigns_for_80pct_spend || "—"}</div>
                                        <p className="text-sm text-neutral-500 mb-4">campañas generan el 80% del gasto</p>
                                        <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                                            <div className="bg-black h-full" style={{ width: '20%' }}></div>
                                        </div>
                                        <p className="text-xs text-neutral-400 mt-2">Concentración de Inversión</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* CREATIVES TAB */}
                    {creativeData && (
                        <TabsContent value="creatives" className="space-y-4">
                            <CreativeAnalysisPanel data={creativeData} />
                        </TabsContent>
                    )}

                    {/* CONVERSATIONS TAB */}
                    {hasConversations && (
                        <TabsContent value="conversations" className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="col-span-1">
                                    {data.conversation_analysis?.lead_funnel && (
                                        <FunnelChart data={data.conversation_analysis.lead_funnel} />
                                    )}
                                </div>
                                <Card className="col-span-1 border-black/10 shadow-none">
                                    <CardHeader>
                                        <CardTitle>Métricas de Chat</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-sm font-medium">Sesiones Totales</span>
                                                <span className="font-bold">{data.conversation_analysis?.total_sessions || 0}</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-sm font-medium">Tasa de Conversión</span>
                                                <span className="font-bold">{data.conversation_analysis?.lead_funnel?.conversion_rate_complete || 0}%</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-sm font-medium">Mensajes Totales</span>
                                                <span className="font-bold">{data.conversation_analysis?.total_messages || 0}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                            <ConversationCharts data={data.conversation_analysis} />
                        </TabsContent>
                    )}

                    {/* DEMOGRAPHICS TAB */}
                    <TabsContent value="demographics" className="space-y-4">
                        {data.demographic_analysis?.heatmap_spend && (
                            <DemographicsChart data={data.demographic_analysis.heatmap_spend} />
                        )}
                    </TabsContent>

                    {/* EFFICIENCY TAB */}
                    <TabsContent value="efficiency" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <ScatterEfficiency campaigns={data.campaign_performance?.all_campaigns || []} />
                            <Card className="col-span-1 border-black/10 shadow-none">
                                <CardHeader>
                                    <CardTitle>Campañas Más Eficientes (Costo/Res)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CampaignTable campaigns={data.campaign_performance?.most_efficient || []} title="Top 10 Eficiencia" />
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* DEEP DIVE TAB */}
                    {deepData && (
                        <TabsContent value="deep" className="space-y-4">
                            <DeepAnalysisPanel data={deepData} />
                        </TabsContent>
                    )}

                    {/* ADVANCED INSIGHTS TAB */}
                    {advancedData && (
                        <TabsContent value="advanced" className="space-y-4">
                            <AdvancedAnalysisPanel data={advancedData} />
                        </TabsContent>
                    )}

                    {/* CONCLUSIONS TAB */}
                    {conclusionsData && (
                        <TabsContent value="conclusions" className="space-y-4">
                            <ConclusionsPanel data={conclusionsData} />
                        </TabsContent>
                    )}
                </Tabs>
            </main>
        </div>
    );
}
