export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import * as XLSX from "xlsx";

type ParsedRow = { product: string; qty: number; rate: number | null; truckNo?: string; invoiceNo?: string };

// Looks for product/qty/rate/truck/invoice columns regardless of exact header
// wording, since SIKOF's sheet headers drift slightly between mails.
function extractRows(sheet: XLSX.WorkSheet): ParsedRow[] {
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });
  if (json.length === 0) return [];

  const headers = Object.keys(json[0]);
  const findHeader = (candidates: string[]) =>
    headers.find((h) => candidates.some((c) => h.toLowerCase().includes(c)));

  const productCol = findHeader(["product description", "product", "item"]);
  const qtyCol = findHeader(["qty in no", "quantity", "qty"]);
  const rateCol = findHeader(["rate", "basic rate", "basic"]);
  const truckCol = findHeader(["truck no", "truck"]);
  const invoiceCol = findHeader(["invoice", "inv no", "dr no"]);

  if (!productCol || !qtyCol) return [];

  return json
    .map((row) => ({
      product: String(row[productCol] ?? "").trim(),
      qty: Number(row[qtyCol]) || 0,
      rate: rateCol && row[rateCol] != null ? Number(row[rateCol]) : null,
      truckNo: truckCol ? String(row[truckCol] ?? "").trim() : undefined,
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

  const aliasRows = await query<{ alias: string; item_id: number }>(
    `SELECT alias, item_id FROM item_aliases WHERE company_id = $1`,
    [company_id]
  );
  const aliasMap = new Map(aliasRows.map((a) => [a.alias.toLowerCase(), a.item_id]));

  const itemRows = await query<{ id: number; name: string }>(
    `SELECT id, name FROM items WHERE company_id = $1`,
    [company_id]
  );
  const nameMap = new Map(itemRows.map((i) => [i.name.toLowerCase(), i.id]));

  const unmatchedProducts: string[] = [];
  const rateMismatches: string[] = [];
  let matchedCount = 0;
  let uploadId: number;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const uploadInsert = await client.query(
      `INSERT INTO dispatch_uploads (company_id, file_name, uploaded_by, rows_total, rows_matched, rows_unmatched)
       VALUES ($1,$2,$3,$4,0,0) RETURNING id`,
      [company_id, file_name ?? null, user.name, rows.length]
    );
    uploadId = uploadInsert.rows[0].id;

    for (const row of rows) {
      const key = row.product.toLowerCase();
      const itemId = aliasMap.get(key) ?? nameMap.get(key);

      if (!itemId) {
        if (!unmatchedProducts.includes(row.product)) unmatchedProducts.push(row.product);
        continue;
      }

      if (row.rate == null) {
        rateMismatches.push(`${row.product}: no rate column found in file - cannot match to a tranche`);
        continue;
      }

      // Rate match is the primary key - a dispatch at a given rate belongs to the
      // tranche booked at that rate, not just "the oldest open one." FIFO is only
      // the tiebreaker between multiple open tranches that share the same rate.
      const openSauda = await client.query(
        `SELECT id, qty, dispatched_qty, rate FROM purchase_sauda
         WHERE item_id = $1 AND company_id = $2
           AND status IN ('open','partially_lifted')
           AND rate = $3
         ORDER BY booking_date ASC, id ASC
         FOR UPDATE`,
        [itemId, company_id, row.rate]
      );

      if (openSauda.rows.length === 0) {
        rateMismatches.push(
          `${row.product} @ ₹${row.rate}: no open tranche booked at this rate (qty ${row.qty})`
        );
        continue;
      }

      matchedCount++;
      let remaining = row.qty;

      for (const sauda of openSauda.rows) {
        if (remaining <= 0) break;
        const open = Number(sauda.qty) - Number(sauda.dispatched_qty);
        if (open <= 0) continue;

        const applied = Math.min(open, remaining);
        const newDispatched = Number(sauda.dispatched_qty) + applied;
        const newStatus = newDispatched >= Number(sauda.qty) ? "closed" : "partially_lifted";

        await client.query(
          `UPDATE purchase_sauda SET dispatched_qty = $1, status = $2 WHERE id = $3`,
          [newDispatched, newStatus, sauda.id]
        );

        await client.query(
          `INSERT INTO purchase_lifts (purchase_sauda_id, qty, truck_no, invoice_no, dispatch_upload_id, created_by)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [sauda.id, applied, row.truckNo ?? null, row.invoiceNo ?? null, uploadId, user.name]
        );

        remaining -= applied;
      }

      if (remaining > 0) {
        rateMismatches.push(
          `${row.product} @ ₹${row.rate}: ${remaining} dispatched beyond what's open at this rate`
        );
      }
    }

    await client.query(
      `UPDATE dispatch_uploads
       SET rows_matched = $1, rows_unmatched = $2, unmatched_products = $3, rate_mismatches = $4
       WHERE id = $5`,
      [matchedCount, unmatchedProducts.length + rateMismatches.length, JSON.stringify(unmatchedProducts), JSON.stringify(rateMismatches), uploadId]
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
    unmatchedProducts,
    rateMismatches,
  });
}
