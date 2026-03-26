"use client";

import { useEffect, useState } from "react";
import { ClientCard } from "@/components/dashboard/ClientCard";
import { NewClientDialog } from "@/components/dashboard/NewClientDialog";
import { Loader2 } from "lucide-react";

interface ClientInfo {
  id: string;
  name: string;
  status: "pending" | "analyzed" | "complete";
  hasCsv: boolean;
  hasConversations: boolean;
  hasAnalysis: boolean;
  hasConclusions: boolean;
  hasPdf: boolean;
  pdfFile: string | null;
  metadata: {
    report_period?: string;
    generated_at?: string;
    total_rows?: number;
  } | null;
}

export default function HomePage() {
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClients = async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    loadClients();
  }, []);

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white sticky top-0 z-50 backdrop-blur-sm bg-white/80">
        <div className="container mx-auto py-5 px-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">arizon.ai</h1>
            <p className="text-sm text-neutral-500">Intelligence Platform</p>
          </div>
          <NewClientDialog onCreated={loadClients} />
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        {/* Stats bar */}
        {!loading && clients.length > 0 && (
          <div className="flex items-center gap-6 mb-6 text-sm text-neutral-500">
            <span><strong className="text-black">{clients.length}</strong> clientes</span>
            <span><strong className="text-black">{clients.filter(c => c.status === "analyzed" || c.status === "complete").length}</strong> analizados</span>
            <span><strong className="text-black">{clients.filter(c => c.status === "complete").length}</strong> completos</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="text-6xl">📊</div>
            <h2 className="text-xl font-bold">Sin clientes aún</h2>
            <p className="text-neutral-500 max-w-md mx-auto">
              Agrega tu primer cliente para comenzar a analizar sus campañas de Meta Ads.
            </p>
            <div className="pt-2">
              <NewClientDialog onCreated={loadClients} />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-100 mt-auto">
        <div className="container mx-auto py-4 px-4 text-center text-xs text-neutral-400">
          arizon.ai Intelligence Platform • Marketing Analytics Pipeline
        </div>
      </footer>
    </div>
  );
}
