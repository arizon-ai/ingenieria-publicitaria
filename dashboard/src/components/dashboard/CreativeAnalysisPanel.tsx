"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any;

interface CreativeAnalysisPanelProps {
    data: AnyData;
}

function fmt(n: number | null, prefix = "", suffix = ""): string {
    if (n === null || n === undefined) return "—";
    return `${prefix}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
}

function fmtInt(n: number | null): string {
    if (n === null || n === undefined) return "—";
    return n.toLocaleString("en-US");
}

export function CreativeAnalysisPanel({ data }: CreativeAnalysisPanelProps) {
    if (!data) return null;

    const topCreatives = data.top_creatives || [];
    const byObjective = data.by_objective || [];
    const byContentType = data.by_content_type || [];
    const byFormat = data.by_format || [];

    const totalSpend = topCreatives.reduce((s: number, c: AnyData) => s + (c.spend || 0), 0);
    const totalConv = topCreatives.reduce((s: number, c: AnyData) => s + (c.conversations || 0), 0);

    // Find best/worst CPR
    const validCPR = topCreatives.filter((c: AnyData) => c.cpr !== null && c.conversations >= 5);
    const bestCPR = validCPR.length > 0 ? validCPR.reduce((a: AnyData, b: AnyData) => a.cpr < b.cpr ? a : b) : null;
    const worstCPR = validCPR.length > 0 ? validCPR.reduce((a: AnyData, b: AnyData) => a.cpr > b.cpr ? a : b) : null;

    return (
        <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-black/10 shadow-none">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-neutral-500 uppercase tracking-wider">Creativos Activos</p>
                        <p className="text-3xl font-bold">{topCreatives.length}</p>
                        <p className="text-xs text-neutral-400">variaciones de anuncios</p>
                    </CardContent>
                </Card>
                <Card className="border-black/10 shadow-none">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-neutral-500 uppercase tracking-wider">Mejor Creativo</p>
                        <p className="text-xl font-bold text-green-700">{bestCPR ? fmt(bestCPR.cpr, "$") : "—"} CPR</p>
                        <p className="text-xs text-neutral-400 truncate">{bestCPR?.ad_name || "—"}</p>
                    </CardContent>
                </Card>
                <Card className="border-black/10 shadow-none">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-neutral-500 uppercase tracking-wider">Peor Creativo</p>
                        <p className="text-xl font-bold text-red-600">{worstCPR ? fmt(worstCPR.cpr, "$") : "—"} CPR</p>
                        <p className="text-xs text-neutral-400 truncate">{worstCPR?.ad_name || "—"}</p>
                    </CardContent>
                </Card>
                <Card className="border-black/10 shadow-none">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-neutral-500 uppercase tracking-wider">Formato Dominante</p>
                        <p className="text-xl font-bold">Video</p>
                        <p className="text-xs text-neutral-400">
                            {byFormat.find((f: AnyData) => f.format === "Video")
                                ? `${((byFormat.find((f: AnyData) => f.format === "Video").spend / totalSpend) * 100).toFixed(0)}% del gasto`
                                : "—"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Top Creatives Table */}
            <Card className="border-black/10 shadow-none">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        🎨 Top Creativos por Inversión
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-200 text-left">
                                    <th className="pb-2 pr-3 font-medium text-neutral-500">#</th>
                                    <th className="pb-2 pr-3 font-medium text-neutral-500">Creativo</th>
                                    <th className="pb-2 pr-3 font-medium text-neutral-500 text-right">Gasto</th>
                                    <th className="pb-2 pr-3 font-medium text-neutral-500 text-right">Conv.</th>
                                    <th className="pb-2 pr-3 font-medium text-neutral-500 text-right">CPR</th>
                                    <th className="pb-2 pr-3 font-medium text-neutral-500 text-right">CTR</th>
                                    <th className="pb-2 pr-3 font-medium text-neutral-500 text-right">Impresiones</th>
                                    <th className="pb-2 pr-3 font-medium text-neutral-500">Tipo</th>
                                    <th className="pb-2 font-medium text-neutral-500" style={{ minWidth: 120 }}>% Gasto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topCreatives.map((c: AnyData, i: number) => {
                                    const pct = totalSpend > 0 ? (c.spend / totalSpend) * 100 : 0;
                                    const isEfficient = c.cpr !== null && c.cpr < 0.20;
                                    const isInefficient = c.cpr !== null && c.cpr > 0.80;
                                    return (
                                        <tr key={i} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                                            <td className="py-2 pr-3 text-neutral-400 font-mono text-xs">{i + 1}</td>
                                            <td className="py-2 pr-3 max-w-[300px]">
                                                <p className="font-medium truncate text-xs">{c.ad_name}</p>
                                                <div className="flex gap-1 mt-0.5">
                                                    <Badge variant="outline" className="text-[10px] px-1 py-0">{c.format}</Badge>
                                                    <Badge variant="outline" className="text-[10px] px-1 py-0">{c.content_type}</Badge>
                                                </div>
                                            </td>
                                            <td className="py-2 pr-3 text-right font-mono font-medium">{fmt(c.spend, "$")}</td>
                                            <td className="py-2 pr-3 text-right font-mono">{fmtInt(c.conversations)}</td>
                                            <td className={`py-2 pr-3 text-right font-mono font-bold ${isEfficient ? "text-green-700" : isInefficient ? "text-red-600" : ""}`}>
                                                {c.cpr !== null ? fmt(c.cpr, "$") : "—"}
                                            </td>
                                            <td className="py-2 pr-3 text-right font-mono">{c.ctr !== null ? fmt(c.ctr, "", "%") : "—"}</td>
                                            <td className="py-2 pr-3 text-right font-mono text-xs">{fmtInt(c.impressions)}</td>
                                            <td className="py-2 pr-3">
                                                <Badge variant={c.objective === "Seguidores IG" ? "destructive" : "secondary"} className="text-[10px]">
                                                    {c.objective}
                                                </Badge>
                                            </td>
                                            <td className="py-2" style={{ minWidth: 120 }}>
                                                <div className="flex items-center gap-2">
                                                    <Progress value={pct} className="h-1.5 flex-1" />
                                                    <span className="text-xs text-neutral-400 font-mono w-10 text-right">{pct.toFixed(1)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* By Objective + By Format side by side */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* By Objective */}
                <Card className="border-black/10 shadow-none">
                    <CardHeader>
                        <CardTitle className="text-base">📊 Rendimiento por Objetivo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-200 text-left">
                                    <th className="pb-2 font-medium text-neutral-500">Objetivo</th>
                                    <th className="pb-2 font-medium text-neutral-500 text-right">Gasto</th>
                                    <th className="pb-2 font-medium text-neutral-500 text-right">Conv.</th>
                                    <th className="pb-2 font-medium text-neutral-500 text-right">CPR</th>
                                    <th className="pb-2 font-medium text-neutral-500 text-right">CTR</th>
                                </tr>
                            </thead>
                            <tbody>
                                {byObjective.map((o: AnyData, i: number) => {
                                    const isBest = o.cpr !== null && o.cpr < 0.15;
                                    const isWorst = o.cpr !== null && o.cpr > 0.80;
                                    return (
                                        <tr key={i} className="border-b border-neutral-100">
                                            <td className="py-2 pr-2">
                                                <span className="font-medium text-xs">{o.objective}</span>
                                                <span className="text-[10px] text-neutral-400 ml-1">({o.creatives})</span>
                                            </td>
                                            <td className="py-2 text-right font-mono text-xs">{fmt(o.spend, "$")}</td>
                                            <td className="py-2 text-right font-mono text-xs">{fmtInt(o.conversations)}</td>
                                            <td className={`py-2 text-right font-mono text-xs font-bold ${isBest ? "text-green-700" : isWorst ? "text-red-600" : ""}`}>
                                                {o.cpr !== null ? fmt(o.cpr, "$") : "—"}
                                            </td>
                                            <td className="py-2 text-right font-mono text-xs">{o.ctr !== null ? fmt(o.ctr, "", "%") : "—"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {/* By Format */}
                <Card className="border-black/10 shadow-none">
                    <CardHeader>
                        <CardTitle className="text-base">🎬 Rendimiento por Formato</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {byFormat.map((f: AnyData, i: number) => {
                                const pct = totalSpend > 0 ? (f.spend / totalSpend) * 100 : 0;
                                return (
                                    <div key={i}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-medium">{f.format}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-neutral-500">{fmtInt(f.conversations)} conv.</span>
                                                <span className={`text-xs font-bold ${f.cpr !== null && f.cpr < 0.3 ? "text-green-700" : f.cpr !== null && f.cpr > 0.8 ? "text-red-600" : ""}`}>
                                                    CPR {f.cpr !== null ? fmt(f.cpr, "$") : "—"}
                                                </span>
                                                <span className="text-xs font-mono">{fmt(f.spend, "$")}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Progress value={pct} className="h-2 flex-1" />
                                            <span className="text-xs text-neutral-400 font-mono w-12 text-right">{pct.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* By Content Type */}
            <Card className="border-black/10 shadow-none">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        💡 Rendimiento por Tipo de Contenido
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-200 text-left">
                                    <th className="pb-2 pr-3 font-medium text-neutral-500">Contenido</th>
                                    <th className="pb-2 pr-3 font-medium text-neutral-500 text-center">Creativos</th>
                                    <th className="pb-2 pr-3 font-medium text-neutral-500 text-right">Gasto</th>
                                    <th className="pb-2 pr-3 font-medium text-neutral-500 text-right">Conv.</th>
                                    <th className="pb-2 pr-3 font-medium text-neutral-500 text-right">CPR</th>
                                    <th className="pb-2 pr-3 font-medium text-neutral-500 text-right">CTR</th>
                                    <th className="pb-2 font-medium text-neutral-500 text-right">Ret. Video</th>
                                </tr>
                            </thead>
                            <tbody>
                                {byContentType.map((ct: AnyData, i: number) => {
                                    const isBest = ct.cpr !== null && ct.cpr < 0.16;
                                    const isWorst = ct.cpr !== null && ct.cpr > 0.80;
                                    return (
                                        <tr key={i} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                                            <td className="py-2 pr-3 font-medium">{ct.content_type}</td>
                                            <td className="py-2 pr-3 text-center font-mono text-xs">{ct.creatives}</td>
                                            <td className="py-2 pr-3 text-right font-mono">{fmt(ct.spend, "$")}</td>
                                            <td className="py-2 pr-3 text-right font-mono">{fmtInt(ct.conversations)}</td>
                                            <td className={`py-2 pr-3 text-right font-mono font-bold ${isBest ? "text-green-700" : isWorst ? "text-red-600" : ""}`}>
                                                {ct.cpr !== null ? fmt(ct.cpr, "$") : "—"}
                                            </td>
                                            <td className="py-2 pr-3 text-right font-mono">{ct.ctr !== null ? fmt(ct.ctr, "", "%") : "—"}</td>
                                            <td className="py-2 text-right font-mono text-xs">{ct.retention !== null ? fmt(ct.retention, "", "%") : "—"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Recommendations Card */}
            <Card className="border-black/10 shadow-none bg-neutral-50">
                <CardHeader>
                    <CardTitle className="text-base">🎯 Recomendaciones</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <h4 className="font-medium text-green-700 mb-2 text-sm">✅ Escalar</h4>
                            <ul className="space-y-1">
                                {topCreatives
                                    .filter((c: AnyData) => c.cpr !== null && c.cpr < 0.16 && c.conversations >= 20)
                                    .slice(0, 5)
                                    .map((c: AnyData, i: number) => (
                                        <li key={i} className="text-xs text-neutral-700">
                                            <span className="font-mono text-green-700 font-bold">${c.cpr.toFixed(2)}</span>{" "}
                                            <span className="truncate">{c.ad_name.substring(0, 40)}...</span>
                                        </li>
                                    ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-medium text-amber-600 mb-2 text-sm">⚠️ Reasignar</h4>
                            <ul className="space-y-1">
                                {topCreatives
                                    .filter((c: AnyData) => c.cpr !== null && c.cpr > 0.50 && c.spend > 5)
                                    .slice(0, 5)
                                    .map((c: AnyData, i: number) => (
                                        <li key={i} className="text-xs text-neutral-700">
                                            <span className="font-mono text-amber-600 font-bold">${c.cpr.toFixed(2)}</span>{" "}
                                            <span className="truncate">{c.ad_name.substring(0, 40)}...</span>
                                        </li>
                                    ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-medium text-red-600 mb-2 text-sm">🔴 Pausar</h4>
                            <ul className="space-y-1">
                                {topCreatives
                                    .filter((c: AnyData) => (c.cpr === null && c.spend > 1) || (c.cpr !== null && c.cpr > 1.0))
                                    .slice(0, 5)
                                    .map((c: AnyData, i: number) => (
                                        <li key={i} className="text-xs text-neutral-700">
                                            <span className="font-mono text-red-600 font-bold">{c.cpr ? `$${c.cpr.toFixed(2)}` : "0 conv"}</span>{" "}
                                            <span className="truncate">{c.ad_name.substring(0, 40)}...</span>
                                        </li>
                                    ))}
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
