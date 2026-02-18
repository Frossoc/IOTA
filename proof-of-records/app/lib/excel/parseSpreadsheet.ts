import ExcelJS from "exceljs";
import { Buffer as NodeBuffer } from "node:buffer";
import { Readable } from "node:stream";

export type ParsedSpreadsheet = {
  columns: string[];
  rows: Record<string, unknown>[];
};

type CellTextValue = { text: string };

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
    return value.richText.map((segment) => segment.text ?? "").join("");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return value;
}

function extractWorksheetRows(workbook: ExcelJS.Workbook): ParsedSpreadsheet {
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { columns: [], rows: [] };
  }

  const headerRow = worksheet.getRow(1);
  const columns: string[] = [];

  headerRow.eachCell((cell, colNumber) => {
    const headerText = String(cellToPrimitive(cell.value) ?? "").trim();
    columns.push(headerText || `col_${colNumber}`);
  });

  const rows: Record<string, unknown>[] = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    if (row.cellCount === 0) {
      continue;
    }

    const parsedRow: Record<string, unknown> = {};
    columns.forEach((columnName, index) => {
      parsedRow[columnName] = cellToPrimitive(row.getCell(index + 1).value);
    });

    const hasData = Object.values(parsedRow).some((value) =>
      String(value ?? "").trim().length > 0
    );

    if (hasData) {
      rows.push(parsedRow);
    }
  }

  return { columns, rows };
}

export async function parseSpreadsheet(
  buffer: ArrayBuffer,
  filename?: string
): Promise<ParsedSpreadsheet> {
  const workbook = new ExcelJS.Workbook();
  const nodeBuffer = NodeBuffer.from(new Uint8Array(buffer));

  if (filename && filename.toLowerCase().endsWith(".csv")) {
    const stream = Readable.from(nodeBuffer);
    await workbook.csv.read(stream);
  } else {
    type XlsxLoadArg = Parameters<typeof workbook.xlsx.load>[0];
    await workbook.xlsx.load(nodeBuffer as unknown as XlsxLoadArg);
  }

  return extractWorksheetRows(workbook);
}
