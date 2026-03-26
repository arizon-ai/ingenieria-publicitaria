"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, Plus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface NewClientDialogProps {
    onCreated: () => void;
}

type Step = "idle" | "creating" | "uploading" | "analyzing" | "done" | "error";

export function NewClientDialog({ onCreated }: NewClientDialogProps) {
    const [open, setOpen] = useState(false);
    const [clientName, setClientName] = useState("");
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [conversationsFile, setConversationsFile] = useState<File | null>(null);
    const [step, setStep] = useState<Step>("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [runAnalysis, setRunAnalysis] = useState(true);
    const csvRef = useRef<HTMLInputElement>(null);
    const convRef = useRef<HTMLInputElement>(null);

    const clientId = clientName.toLowerCase().replace(/[^a-z0-9_-]/g, "_");

    const reset = () => {
        setClientName("");
        setCsvFile(null);
        setConversationsFile(null);
        setStep("idle");
        setErrorMsg("");
        setRunAnalysis(true);
    };

    const handleSubmit = async () => {
        if (!clientName.trim()) return;

        try {
            // 1. Create client
            setStep("creating");
            const createRes = await fetch("/api/clients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: clientName.trim() }),
            });
            if (!createRes.ok) {
                const data = await createRes.json();
                throw new Error(data.error || "Failed to create client");
            }

            // 2. Upload CSV
            if (csvFile) {
                setStep("uploading");
                const formData = new FormData();
                formData.append("client", clientId);
                formData.append("file", csvFile);
                formData.append("type", "campaigns");
                const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
                if (!uploadRes.ok) throw new Error("Failed to upload CSV");
            }

            // 3. Upload conversations (optional)
            if (conversationsFile) {
                const formData = new FormData();
                formData.append("client", clientId);
                formData.append("file", conversationsFile);
                formData.append("type", "conversations");
                await fetch("/api/upload", { method: "POST", body: formData });
            }

            // 4. Run analysis (optional)
            if (csvFile && runAnalysis) {
                setStep("analyzing");
                const analyzeRes = await fetch("/api/analyze", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ client: clientId }),
                });
                if (!analyzeRes.ok) {
                    const data = await analyzeRes.json();
                    throw new Error(data.details || "Analysis failed");
                }
            }

            setStep("done");
            onCreated();
            setTimeout(() => {
                setOpen(false);
                reset();
            }, 1500);
        } catch (err) {
            setStep("error");
            setErrorMsg(err instanceof Error ? err.message : "Unknown error");
        }
    };

    const stepLabels: Record<Step, string> = {
        idle: "",
        creating: "Creando cliente...",
        uploading: "Subiendo archivos...",
        analyzing: "Ejecutando análisis (puede tomar ~30s)...",
        done: "¡Listo!",
        error: "Error",
    };

    const isProcessing = ["creating", "uploading", "analyzing"].includes(step);

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild>
                <Button className="bg-black text-white hover:bg-black/80 gap-2">
                    <Plus className="h-4 w-4" /> Agregar Cliente
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Nuevo Cliente</DialogTitle>
                    <DialogDescription>
                        Crea un nuevo cliente y sube su CSV de Meta Ads para análisis.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Client Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre del Cliente</Label>
                        <Input
                            id="name"
                            placeholder="Ej: MiEmpresa"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            disabled={isProcessing}
                        />
                        {clientName && (
                            <p className="text-[11px] text-muted-foreground">ID: {clientId}</p>
                        )}
                    </div>

                    {/* CSV Upload */}
                    <div className="space-y-2">
                        <Label>CSV de Campañas (Meta Ads Export)</Label>
                        <div
                            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                ${csvFile ? 'border-emerald-300 bg-emerald-50' : 'border-neutral-200 hover:border-neutral-400'}`}
                            onClick={() => csvRef.current?.click()}
                        >
                            <input
                                ref={csvRef}
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                            />
                            {csvFile ? (
                                <div className="flex items-center justify-center gap-2 text-emerald-700">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <span className="text-sm font-medium">{csvFile.name}</span>
                                    <span className="text-xs text-muted-foreground">({(csvFile.size / 1024).toFixed(0)} KB)</span>
                                </div>
                            ) : (
                                <div>
                                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">Click para seleccionar CSV</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Conversations Upload (optional) */}
                    <div className="space-y-2">
                        <Label className="text-muted-foreground">Conversaciones JSON (opcional)</Label>
                        <div
                            className={`border border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors text-sm
                ${conversationsFile ? 'border-emerald-300 bg-emerald-50' : 'border-neutral-200 hover:border-neutral-400'}`}
                            onClick={() => convRef.current?.click()}
                        >
                            <input
                                ref={convRef}
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={(e) => setConversationsFile(e.target.files?.[0] || null)}
                            />
                            {conversationsFile ? (
                                <span className="text-emerald-700 text-xs">{conversationsFile.name}</span>
                            ) : (
                                <span className="text-xs text-muted-foreground">Click para subir conversaciones</span>
                            )}
                        </div>
                    </div>

                    {/* Auto-analyze toggle */}
                    {csvFile && (
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={runAnalysis}
                                onChange={(e) => setRunAnalysis(e.target.checked)}
                                className="rounded"
                            />
                            Ejecutar análisis automáticamente después de subir
                        </label>
                    )}

                    {/* Step indicator */}
                    {step !== "idle" && (
                        <div className={`rounded-lg p-3 text-sm flex items-center gap-2 ${step === "done" ? "bg-emerald-50 text-emerald-700" :
                                step === "error" ? "bg-red-50 text-red-700" :
                                    "bg-neutral-50 text-neutral-700"
                            }`}>
                            {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                            {step === "done" && <CheckCircle2 className="h-4 w-4" />}
                            {step === "error" && <AlertCircle className="h-4 w-4" />}
                            <span>{stepLabels[step]}</span>
                            {step === "error" && <span className="text-xs ml-1">— {errorMsg}</span>}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => { setOpen(false); reset(); }} disabled={isProcessing}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!clientName.trim() || isProcessing}
                        className="bg-black text-white hover:bg-black/80"
                    >
                        {isProcessing ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Procesando...</>
                        ) : (
                            <><Plus className="h-4 w-4 mr-2" /> Crear Cliente</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
