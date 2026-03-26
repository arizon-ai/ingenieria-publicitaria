import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);
const ROOT_DIR = path.join(process.cwd(), "..");

export async function POST(request: Request) {
    try {
        const { client } = await request.json();

        if (!client || typeof client !== "string") {
            return NextResponse.json({ error: "client name is required" }, { status: 400 });
        }

        // 1. Run Python analysis
        const analyzeCmd = `python "${path.join(ROOT_DIR, "pipeline", "analyze.py")}" --client ${client}`;
        const { stdout: analyzeOut, stderr: analyzeErr } = await execAsync(analyzeCmd, {
            cwd: ROOT_DIR,
            timeout: 120000, // 2 min timeout
        });

        if (analyzeErr && !analyzeErr.includes("Warning")) {
            console.error("Analysis stderr:", analyzeErr);
        }

        // 2. Run data sync
        const syncCmd = `node "${path.join(process.cwd(), "copy-client-data.js")}" --client ${client}`;
        const { stdout: syncOut } = await execAsync(syncCmd, {
            cwd: process.cwd(),
            timeout: 30000,
        });

        return NextResponse.json({
            success: true,
            client,
            analyzeOutput: analyzeOut.slice(-500), // Last 500 chars
            syncOutput: syncOut.slice(-300),
        });
    } catch (err: unknown) {
        const error = err as { stdout?: string; stderr?: string; message?: string };
        console.error("Analysis error:", error.stderr || error.message);
        return NextResponse.json({
            error: "Analysis failed",
            details: error.stderr || error.message || "Unknown error",
            stdout: error.stdout?.slice(-500),
        }, { status: 500 });
    }
}
