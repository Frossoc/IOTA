import { NextResponse } from "next/server";
import { Buffer as NodeBuffer } from "node:buffer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";

type ProofSummaryPayload = {
  project_context?: {
    project_name?: string;
    process_type?: string;
    description?: string;
  };
  rows_count?: number;
  metrics?: {
    total_units?: number;
  };
  event_hash?: string;
  uri?: string;
  tx_digest?: string;
  object_id?: string | null;
  explorer?: {
    tx?: string;
    object?: string;
    package?: string;
  };
  evidence?: {
    photo_hash?: string;
    photo_uri?: string;
  };
  timestamp?: string;
  issuer?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parsePayload(raw: unknown): ProofSummaryPayload | null {
  const root = asRecord(raw);
  if (!root) {
    return null;
  }

  const projectContext = asRecord(root.project_context);
  const metrics = asRecord(root.metrics);
  const explorer = asRecord(root.explorer);
  const evidence = asRecord(root.evidence);

  return {
    project_context: projectContext
      ? {
          project_name: asString(projectContext.project_name),
          process_type: asString(projectContext.process_type),
          description: asString(projectContext.description),
        }
      : undefined,
    rows_count: asNumber(root.rows_count),
    metrics: metrics ? { total_units: asNumber(metrics.total_units) } : undefined,
    event_hash: asString(root.event_hash),
    uri: asString(root.uri),
    tx_digest: asString(root.tx_digest),
    object_id: typeof root.object_id === "string" || root.object_id === null ? root.object_id : undefined,
    explorer: explorer
      ? {
          tx: asString(explorer.tx),
          object: asString(explorer.object),
          package: asString(explorer.package),
        }
      : undefined,
    evidence: evidence
      ? {
          photo_hash: asString(evidence.photo_hash),
          photo_uri: asString(evidence.photo_uri),
        }
      : undefined,
    timestamp: asString(root.timestamp),
    issuer: asString(root.issuer),
  };
}

async function buildPdfBytes(payload: ProofSummaryPayload): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const left = 48;
  let y = 800;

  const drawTitle = (text: string) => {
    page.drawText(text, {
      x: left,
      y,
      size: 20,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    y -= 30;
  };

  const drawSection = (title: string, rows: string[]) => {
    page.drawText(title, {
      x: left,
      y,
      size: 13,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    y -= 18;

    for (const row of rows) {
      page.drawText(row, {
        x: left,
        y,
        size: 10.5,
        font: fontRegular,
        color: rgb(0, 0, 0),
        maxWidth: 500,
        lineHeight: 12,
      });
      y -= 14;
    }

    y -= 8;
  };

  drawTitle("Proof of Records — Integrity Report");

  drawSection("Project", [
    `Project name: ${payload.project_context?.project_name ?? "N/A"}`,
    `Process type: ${payload.project_context?.process_type ?? "N/A"}`,
    `Description: ${payload.project_context?.description ?? "N/A"}`,
  ]);

  drawSection("Dataset Summary", [
    `Records secured: ${payload.rows_count ?? 0}`,
    `Total units: ${payload.metrics?.total_units ?? 0}`,
    `Timestamp: ${payload.timestamp ?? "N/A"}`,
  ]);

  drawSection("Integrity Proof", [
    `Event hash: ${payload.event_hash ?? "N/A"}`,
    `IPFS URI: ${payload.uri ?? "N/A"}`,
    `Tx digest: ${payload.tx_digest ?? "N/A"}`,
    `Object ID: ${payload.object_id ?? "N/A"}`,
    `Issuer: ${payload.issuer ?? "N/A"}`,
  ]);

  if (payload.evidence?.photo_hash || payload.evidence?.photo_uri) {
    drawSection("Evidence", [
      "Evidence attached: Yes",
      `Photo hash: ${payload.evidence.photo_hash ?? "N/A"}`,
      `Photo URI: ${payload.evidence.photo_uri ?? "N/A"}`,
    ]);
  }

  drawSection("Verification Links", [
    `Transaction: ${payload.explorer?.tx ?? "N/A"}`,
    `Proof Object: ${payload.explorer?.object ?? "N/A"}`,
  ]);

  page.drawText("Powered by Biosphere Integrity Infrastructure", {
    x: left,
    y: 48,
    size: 10,
    font: fontItalic,
    color: rgb(0.2, 0.2, 0.2),
  });

  return pdf.save();
}

export async function POST(req: Request) {
  try {
    const raw = (await req.json()) as unknown;
    const payload = parsePayload(raw);

    if (!payload || !payload.event_hash || !payload.uri) {
      return NextResponse.json({ error: "Invalid summary payload" }, { status: 400 });
    }

    const pdfBytes = await buildPdfBytes(payload);

    const pdfBuffer = NodeBuffer.from(pdfBytes);
    return new NextResponse(new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" }), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=\"proof-summary.pdf\"",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate proof summary PDF" }, { status: 500 });
  }
}
