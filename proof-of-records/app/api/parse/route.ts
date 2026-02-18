import { NextResponse } from "next/server";
import { parseSpreadsheet } from "@/app/lib/excel/parseSpreadsheet";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const { columns, rows } = await parseSpreadsheet(buffer, file.name);

    return NextResponse.json({
      columns,
      preview: rows.slice(0, 10),
      sampleRow: rows[0] ?? {},
      totalRows: rows.length,
    });
  } catch {
    return NextResponse.json({ error: "Failed to parse spreadsheet" }, { status: 500 });
  }
}
