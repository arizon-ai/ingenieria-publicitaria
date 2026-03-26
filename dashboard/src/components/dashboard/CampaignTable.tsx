
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Campaign } from "@/types/analysis";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

interface CampaignTableProps {
    campaigns: Campaign[];
    title: string;
}

export function CampaignTable({ campaigns, title }: CampaignTableProps) {
    return (
        <div className="rounded-md border border-neutral-200">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50/50">
                <h3 className="font-semibold text-sm">{title}</h3>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[300px]">Campaña</TableHead>
                        <TableHead>Estado/Tipo</TableHead>
                        <TableHead className="text-right">Gasto</TableHead>
                        <TableHead className="text-right">Resultados</TableHead>
                        <TableHead className="text-right">Costo / Res</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {campaigns.map((camp, i) => (
                        <TableRow key={i}>
                            <TableCell className="font-medium text-xs break-words max-w-[300px]">
                                {camp.campaign}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="text-[10px] font-normal">
                                    {camp.result_type}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs">{formatCurrency(camp.spend)}</TableCell>
                            <TableCell className="text-right text-xs">{formatNumber(camp.results)}</TableCell>
                            <TableCell className="text-right text-xs font-semibold">
                                {formatCurrency(camp.cost_per_result)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
