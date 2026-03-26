import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CLIENTS_DIR = path.join(process.cwd(), "..", "clients");

export async function GET() {
    try {
        if (!fs.existsSync(CLIENTS_DIR)) {
            return NextResponse.json([]);
        }

        const dirs = fs.readdirSync(CLIENTS_DIR, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name);

        const clients = dirs.map(id => {
            const inputDir = path.join(CLIENTS_DIR, id, "input");
            const analysisDir = path.join(CLIENTS_DIR, id, "analysis");
            const outputDir = path.join(CLIENTS_DIR, id, "output");

            const hasCsv = fs.existsSync(path.join(inputDir, "campaigns.csv"));
            const hasConversations = fs.existsSync(path.join(inputDir, "conversations.json"));
            const hasAnalysis = fs.existsSync(path.join(analysisDir, "analysis_results.json"));
            const hasConclusions = fs.existsSync(path.join(CLIENTS_DIR, id, "conclusions.md"));

            // Find PDF in output
            let pdfFile: string | null = null;
            if (fs.existsSync(outputDir)) {
                const pdfs = fs.readdirSync(outputDir).filter(f => f.endsWith(".pdf"));
                if (pdfs.length > 0) pdfFile = pdfs[0];
            }

            // Get analysis metadata if available
            let metadata: Record<string, unknown> | null = null;
            const analysisPath = path.join(analysisDir, "analysis_results.json");
            if (fs.existsSync(analysisPath)) {
                try {
                    const raw = JSON.parse(fs.readFileSync(analysisPath, "utf-8"));
                    metadata = raw.metadata || null;
                } catch { /* ignore */ }
            }

            // Display name
            const name = id.charAt(0).toUpperCase() + id.slice(1);

            // Status
            let status: "pending" | "analyzed" | "complete" = "pending";
            if (hasAnalysis && hasConclusions) status = "complete";
            else if (hasAnalysis) status = "analyzed";

            return {
                id,
                name,
                status,
                hasCsv,
                hasConversations,
                hasAnalysis,
                hasConclusions,
                hasPdf: !!pdfFile,
                pdfFile,
                metadata,
            };
        });

        return NextResponse.json(clients);
    } catch (err) {
        console.error("Error listing clients:", err);
        return NextResponse.json({ error: "Failed to list clients" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { name } = await request.json();

        if (!name || typeof name !== "string") {
            return NextResponse.json({ error: "Client name is required" }, { status: 400 });
        }

        // Sanitize name: lowercase, no spaces
        const id = name.toLowerCase().replace(/[^a-z0-9_-]/g, "_");

        const clientDir = path.join(CLIENTS_DIR, id);
        if (fs.existsSync(clientDir)) {
            // Idempotent: allow proceeding if client exists (enables retrying uploads/analysis)
            return NextResponse.json({ id, name, status: "pending" }, { status: 200 });
        }

        // Create directory structure
        fs.mkdirSync(path.join(clientDir, "input"), { recursive: true });
        fs.mkdirSync(path.join(clientDir, "analysis"), { recursive: true });
        fs.mkdirSync(path.join(clientDir, "output"), { recursive: true });

        return NextResponse.json({ id, name, status: "pending" }, { status: 201 });
    } catch (err) {
        console.error("Error creating client:", err);
        return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
    }
}
