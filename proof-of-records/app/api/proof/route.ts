import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { Buffer as NodeBuffer } from "node:buffer";
import { createHash } from "node:crypto";
import type { ColumnMapping, ProofResponse } from "@/app/types/records";
import { normalizeRows } from "@/app/lib/excel/normalize";
import { stableStringify } from "@/app/lib/proof/canonicalize";
import { sha256Hex } from "@/app/lib/proof/hash";
import { storeBundle } from "@/app/lib/storage/storeBundle";
import { uploadFileToPinata, uploadJsonToPinata } from "@/app/lib/storage/pinata";
import { mintProofUnitsToken, registerProofOnChain } from "@/app/lib/iota/move";

export const runtime = "nodejs";

type CellTextValue = {
  text: string;
};

type RichTextValue = {
  richText: Array<{ text?: string }>;
};

function isCellTextValue(value: unknown): value is CellTextValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "text" in value &&
    typeof (value as { text?: unknown }).text === "string"
  );
}

function isRichTextValue(value: unknown): value is RichTextValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "richText" in value &&
    Array.isArray((value as { richText?: unknown }).richText)
  );
}

function cellToPrimitive(value: unknown): unknown {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (isCellTextValue(value)) {
    return value.text;
  }

  if (isRichTextValue(value)) {
    return value.richText.map((part) => part.text ?? "").join("");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return value;
}

function isColumnMapping(value: unknown): value is ColumnMapping {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.date === "string" &&
    candidate.date.trim().length > 0 &&
    typeof candidate.type === "string" &&
    candidate.type.trim().length > 0 &&
    typeof candidate.value === "string" &&
    candidate.value.trim().length > 0 &&
    typeof candidate.unit === "string" &&
    candidate.unit.trim().length > 0
  );
}

async function parseFirstSheetRows(buffer: ArrayBuffer): Promise<Record<string, unknown>[]> {
  const workbook = new ExcelJS.Workbook();
  const nodeBuffer: NodeBuffer = NodeBuffer.from(new Uint8Array(buffer));
  type LoadArg = Parameters<(typeof workbook.xlsx.load)>[0];
  await workbook.xlsx.load(nodeBuffer as unknown as LoadArg);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return [];
  }

  const headerRow = worksheet.getRow(1);
  const columns: string[] = [];

  headerRow.eachCell((cell, colNumber) => {
    const name = String(cellToPrimitive(cell.value) ?? "").trim();
    columns.push(name || `col_${colNumber}`);
  });

  const rawRows: Record<string, unknown>[] = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    if (row.cellCount === 0) {
      continue;
    }

    const record: Record<string, unknown> = {};
    columns.forEach((columnName, index) => {
      record[columnName] = cellToPrimitive(row.getCell(index + 1).value);
    });

    const hasData = Object.values(record).some((v) => String(v ?? "").trim().length > 0);
    if (hasData) {
      rawRows.push(record);
    }
  }

  return rawRows;
}

function isUnitCountedForProofUnits(unit: string): boolean {
  const normalized = unit.trim().toLowerCase();
  return normalized === "kg" || normalized === "kgs" || normalized === "kilogram" || normalized === "kilograms";
}

function computeTotalUnits(
  rows: Array<{
    value: number;
    unit: string;
  }>
): number {
  return rows.reduce((sum, row) => {
    if (!isUnitCountedForProofUnits(row.unit)) {
      return sum;
    }
    return sum + row.value;
  }, 0);
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const mappingRaw = form.get("mapping");
    const photo = form.get("photo");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (typeof mappingRaw !== "string") {
      return NextResponse.json({ error: "Missing mapping" }, { status: 400 });
    }

    let parsedMapping: unknown;
    try {
      parsedMapping = JSON.parse(mappingRaw);
    } catch {
      return NextResponse.json({ error: "Invalid mapping JSON" }, { status: 400 });
    }

    if (!isColumnMapping(parsedMapping)) {
      return NextResponse.json({ error: "Invalid mapping shape" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const rawRows = await parseFirstSheetRows(buffer);

    const { rows, errors, warnings } = normalizeRows(rawRows, parsedMapping);

    const issuer = "biosphere-rocks";
    const timestamp = new Date().toISOString();
    let evidence:
      | {
          photo_hash: string;
          photo_uri: string;
        }
      | undefined;

    if (photo instanceof File) {
      if (!process.env.PINATA_JWT) {
        return NextResponse.json(
          { error: "PINATA_JWT is required when photo evidence is provided" },
          { status: 400 }
        );
      }

      try {
        const photoBytes = await photo.arrayBuffer();
        const photo_hash = createHash("sha256")
          .update(NodeBuffer.from(photoBytes))
          .digest("hex");
        const uploadedPhoto = await uploadFileToPinata(photo, photo.name || "evidence.jpg");
        evidence = {
          photo_hash,
          photo_uri: uploadedPhoto.uri,
        };
      } catch {
        return NextResponse.json({ error: "Failed to upload photo evidence" }, { status: 502 });
      }
    }

    const sortedRows =
      errors.length > 0
        ? []
        : [...rows].sort((a, b) => {
            return (
              a.date.localeCompare(b.date) ||
              a.type.localeCompare(b.type) ||
              a.value - b.value ||
              a.unit.localeCompare(b.unit)
            );
          });
    const totalUnits = computeTotalUnits(sortedRows);

    const canonicalObj = {
      adapter: "records",
      issuer,
      timestamp,
      rows: sortedRows,
      metrics: {
        total_units: totalUnits,
      },
      ...(evidence ? { evidence } : {}),
    };

    const canonical_string = stableStringify(canonicalObj);
    const event_hash = sha256Hex(canonical_string);
    const stored = await storeBundle(canonicalObj);
    let uri = stored.uri;
    let txId: string | undefined;
    let explorerTx: string | undefined;
    let token:
      | {
          supply: number;
          txId: string;
          explorerTx: string;
        }
      | undefined;

    if (process.env.PINATA_JWT) {
      try {
        const firstBundle = await uploadJsonToPinata(
          {
            canonical: canonicalObj,
            event_hash,
            uri: stored.uri,
            metrics: {
              total_units: totalUnits,
            },
            ...(evidence ? { evidence } : {}),
          },
          "bundle.json"
        );
        uri = firstBundle.uri;

        // Best-effort second write so bundle.json includes the resolved bundle URI.
        try {
          await uploadJsonToPinata(
            {
              canonical: canonicalObj,
              event_hash,
              uri,
              metrics: {
                total_units: totalUnits,
              },
              ...(evidence ? { evidence } : {}),
            },
            "bundle.json"
          );
        } catch {
          // Ignore secondary write failures and keep primary URI.
        }
      } catch {
        // Keep existing local URI fallback for MVP resilience.
      }
    }

    const hasIotaEnv =
      Boolean(process.env.IOTA_RPC_URL && process.env.IOTA_RPC_URL.trim().length > 0) &&
      Boolean(
        (process.env.IOTA_PRIVATE_KEY && process.env.IOTA_PRIVATE_KEY.trim().length > 0) ||
          (process.env.IOTA_MNEMONIC && process.env.IOTA_MNEMONIC.trim().length > 0)
      );

    if (hasIotaEnv) {
      try {
        const anchored = await registerProofOnChain({
          event_hash,
          uri,
          schema_version: "v1",
          adapter: "records",
        });
        txId = anchored.txId;
        explorerTx = anchored.explorerTx;
      } catch {
        // Keep response working even when on-chain anchor fails.
      }

      try {
        const shouldMint = process.env.IOTA_ENABLE_PROOF_UNITS_MINT === "1";
        if (shouldMint && totalUnits > 0) {
          const minted = await mintProofUnitsToken({
            supply: totalUnits,
            event_hash,
            uri,
          });
          token = {
            supply: totalUnits,
            txId: minted.txId,
            explorerTx: minted.explorerTx,
          };
        }
      } catch {
        // Keep response working even when token minting fails.
      }
    }

    const response: ProofResponse = {
      ok: true,
      rows_count: sortedRows.length,
      event_hash,
      canonical_string,
      uri,
      issuer,
      timestamp,
      warnings,
      errors,
      metrics: {
        total_units: totalUnits,
      },
      ...(txId ? { txId } : {}),
      ...(explorerTx ? { explorer: { tx: explorerTx } } : {}),
      ...(token ? { token } : {}),
      ...(evidence ? { evidence } : {}),
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: "Failed to generate proof bundle" }, { status: 500 });
  }
}
