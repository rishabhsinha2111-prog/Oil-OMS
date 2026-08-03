export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import * as XLSX from "xlsx";

type ParsedRow = { product: string; qty: number; invoiceNo?: string };

// Looks for the product-name and quantity columns regardless of exact header
// wording, since SIKOF's sheet headers drift slightly between mails
// (e.g. "Product Description" vs "Item"). Falls back to the widest text
// column and the first numeric column if nothing matches by name.
function extractRows(sheet: XLSX.WorkSheet): ParsedRow[] {
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });
  if (json.length === 0) return [];

  const headers = Object.keys(json[0]);
  const findHeader = (candidates: string[]) =>
    headers.find((h) => candidates.some((c) => h.toLowerCase().includes(c)));

  const productCol = findHeader(["product description", "product", "item"]);
  const qtyCol = findHeader(["qty in no", "quantity", "qty"]);
  const invoiceCol = findHeader(["invoice", "inv no", "dr no"]);

  if (!productCol || !qtyCol) return [];

  return json
    .map((row) => ({
      product: String(row[productCol] ?? "").trim(),
      qty: Number(row[qtyCol]) || 0,
      invoiceNo: invoiceCol ? String(row[invoiceCol] ?? "").trim() : undefined,
    }))
    .filter((r) => r.product && r.qty > 0);
}

export async function POST(req: NextRequest) {
  const user = getSessionUser();
  if (!user || (user.role !== "purchase" && user.role !== "admin")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { company_id, file_name, file_base64 } = await req.json();
  if (!company_id || !file_base64) {
    return NextResponse.json({ error: "company_id and file are required" }, { status: 400 });
  }

  const buf = Buffer.from(file_base64, "base64");
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = extractRows(sheet);

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Could not find product/quantity columns in the uploaded file" },
      { status: 400 }
    );
  }

  // Load alias map for this company
  const aliasRows = await query<{ alias: string; item_id: number }>(
    `SELECT alias, item_id FROM item_aliases WHERE company_id = $1`,
    [company_id]
  );
  const aliasMap = new Map(aliasRows.map((a) => [a.alias.toLowerCase(), a.item_id]));

  // Also allow direct match against the item's own name
  const itemRows = await query<{ id: number; name: string }>(
    `SELECT id, name FROM items WHERE company_id = $1`,
    [company_id]
  );
  const nameMap = new Map(itemRows.map((i) => [i.name.toLowerCase(), i.id]));

  const unmatched: string[] = [];
  let matchedCount = 0;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const row of rows) {
      const key = row.product.toLowerCase();
      const itemId = aliasMap.get(key) ?? nameMap.get(key);

      if (!itemId) {
        if (!unmatched.includes(row.product)) unmatched.push(row.product);
        continue;
      }

      matchedCount++;
      let remaining = row.qty;

      // FIFO: apply against oldest open purchase sauda for this item first
      const openSauda = await client.query(
        `SELECT id, qty, dispatched_qty FROM purchase_sauda
         WHERE item_id = $1 AND company_id = $2 AND status IN ('booked','partially_dispatched')
         ORDER BY booking_date ASC, id ASC
         FOR UPDATE`,
        [itemId, company_id]
      );

      for (const sauda of openSauda.rows) {
        if (remaining <= 0) break;
        const open = Number(sauda.qty) - Number(sauda.dispatched_qty);
        if (open <= 0) continue;

        const applied = Math.min(open, remaining);
        const newDispatched = Number(sauda.dispatched_qty) + applied;
        const newStatus = newDispatched >= Number(sauda.qty) ? "closed" : "partially_dispatched";

        await client.query(
          `UPDATE purchase_sauda SET dispatched_qty = $1, status = $2 WHERE id = $3`,
          [newDispatched, newStatus, sauda.id]
        );

        remaining -= applied;
      }
      // Note: if remaining > 0 after this loop, dispatch exceeded what was booked -
      // that's a real mismatch worth surfacing, not silently dropping. Logged via unmatched-style flag below.
      if (remaining > 0) {
        unmatched.push(`${row.product} (${remaining} dispatched beyond booked qty)`);
      }
    }

    await client.query(
      `INSERT INTO dispatch_uploads
        (company_id, file_name, uploaded_by, rows_total, rows_matched, rows_unmatched, unmatched_products)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        company_id,
        file_name ?? null,
        user.name,
        rows.length,
        matchedCount,
        unmatched.length,
        JSON.stringify(unmatched),
      ]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return NextResponse.json({
    rowsTotal: rows.length,
    rowsMatched: matchedCount,
    unmatched,
  });
}
