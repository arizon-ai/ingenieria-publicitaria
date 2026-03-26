"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { BarChart3, FileText, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface ClientCardProps {
    client: {
        id: string;
        name: string;
        status: "pending" | "analyzed" | "complete";
        hasCsv: boolean;
        hasConversations: boolean;
        hasAnalysis: boolean;
        hasConclusions: boolean;
        hasPdf: boolean;
        pdfFile?: string | null;
        metadata?: {
            report_period?: string;
            generated_at?: string;
            total_rows?: number;
        } | null;
    };
}

const statusConfig = {
    pending: { label: "Pendiente", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
    analyzed: { label: "Analizado", color: "bg-blue-100 text-blue-800 border-blue-200", icon: BarChart3 },
    complete: { label: "Completo", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
};

export function ClientCard({ client }: ClientCardProps) {
    const router = useRouter();
    const status = statusConfig[client.status];
    const StatusIcon = status.icon;

    const generatedDate = client.metadata?.generated_at
        ? new Date(client.metadata.generated_at).toLocaleDateString("es-VE", {
            year: "numeric", month: "short", day: "numeric",
        })
        : null;

    const handleCardClick = () => {
        if (client.hasAnalysis) {
            router.push(`/client/${client.id}`);
        }
    };

    return (
        <div onClick={handleCardClick} role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}>
            <Card className={`border-black/10 shadow-none hover:shadow-md hover:border-black/20 transition-all duration-200 cursor-pointer group ${!client.hasAnalysis ? 'opacity-60' : ''}`}>
                <CardContent className="pt-6 pb-5">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-lg tracking-tight group-hover:underline">{client.name}</h3>
                            {client.metadata?.report_period && client.metadata.report_period !== "Auto-detected" && (
                                <p className="text-xs text-muted-foreground mt-0.5">{client.metadata.report_period}</p>
                            )}
                        </div>
                        <Badge variant="outline" className={`text-[10px] font-medium ${status.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {client.hasCsv && (
                            <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" /> CSV
                            </span>
                        )}
                        {client.hasConversations && (
                            <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" /> Conversaciones
                            </span>
                        )}
                        {client.hasAnalysis && (
                            <span className="flex items-center gap-1">
                                <BarChart3 className="h-3 w-3" /> Análisis
                            </span>
                        )}
                        {client.hasPdf && client.pdfFile ? (
                            <a
                                href={`/data/${client.id}/${client.pdfFile}`}
                                download
                                className="flex items-center gap-1 hover:text-blue-600 hover:underline transition-colors z-10 relative"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <FileText className="h-3 w-3" /> PDF
                            </a>
                        ) : client.hasPdf ? (
                            <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" /> PDF
                            </span>
                        ) : null}
                        {!client.hasCsv && (
                            <span className="flex items-center gap-1 text-amber-600">
                                <AlertCircle className="h-3 w-3" /> Sin datos
                            </span>
                        )}
                    </div>

                    {generatedDate && (
                        <p className="text-[10px] text-muted-foreground mt-3 border-t pt-2">
                            Último análisis: {generatedDate}
                        </p>
                    )}

                    {client.metadata?.total_rows && (
                        <p className="text-[10px] text-muted-foreground">
                            {client.metadata.total_rows.toLocaleString()} filas procesadas
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
