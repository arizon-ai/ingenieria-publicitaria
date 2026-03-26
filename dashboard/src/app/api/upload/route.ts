import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CLIENTS_DIR = path.join(process.cwd(), "..", "clients");

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const clientId = formData.get("client") as string;
        const file = formData.get("file") as File;
        const fileType = (formData.get("type") as string) || "campaigns"; // "campaigns" or "conversations"

        if (!clientId || !file) {
            return NextResponse.json({ error: "client and file are required" }, { status: 400 });
        }

        const inputDir = path.join(CLIENTS_DIR, clientId, "input");
        if (!fs.existsSync(inputDir)) {
            fs.mkdirSync(inputDir, { recursive: true });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        let filename: string;
        if (fileType === "conversations") {
            filename = "conversations.json";
        } else {
            filename = "campaigns.csv";
        }

        fs.writeFileSync(path.join(inputDir, filename), buffer);

        return NextResponse.json({
            success: true,
            file: filename,
            size: buffer.length,
            client: clientId,
        });
    } catch (err) {
        console.error("Error uploading file:", err);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
