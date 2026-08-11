export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const rows =
    user.role === "admin"
      ? await query(
          `SELECT ind.*, c.name AS company_name, i.name AS item_name, ps.rate, ps.expiry_date
           FROM indent_sauda ind
           JOIN purchase_sauda ps ON ps.id = ind.purchase_sauda_id
           JOIN companies c ON c.id = ps.company_id
           JOIN items i ON i.id = ps.item_id
           ORDER BY ind.created_at DESC`
        )
      : await query(
          `SELECT ind.*, c.name AS company_name, i.name AS item_name, ps.rate, ps.expiry_date
           FROM indent_sauda ind
           JOIN purchase_sauda ps ON ps.id = ind.purchase_sauda_id
           JOIN companies c ON c.id = ps.company_id
           JOIN items i ON i.id = ps.item_id
           WHERE ind.created_by = $1
           ORDER BY ind.created_at DESC`,
          [user.name]
        );

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = getSessionUser();
  if (!user || (user.role !== "purchase" && user.role !== "admin")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { purchase_sauda_id, qty, notes } = await req.json();
  if (!purchase_sauda_id || !qty || Number(qty) <= 0) {
    return NextResponse.json({ error: "purchase_sauda_id and a positive qty are required" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock the tranche row so two simultaneous indents can't both pass the
    // capacity check against the same remaining qty.
    const saudaRes = await client.query(
      `SELECT qty, dispatched_qty, status FROM purchase_sauda WHERE id = $1 FOR UPDATE`,
      [purchase_sauda_id]
    );
    if (saudaRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Purchase sauda tranche not found" }, { status: 404 });
    }
    const sauda = saudaRes.rows[0];
    if (!["open", "partially_lifted"].includes(sauda.status)) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "This tranche is no longer open" }, { status: 400 });
    }

    const remaining = Number(sauda.qty) - Number(sauda.dispatched_qty);

    const reservedRes = await client.query(
      `SELECT COALESCE(SUM(qty), 0) AS reserved FROM indent_sauda
       WHERE purchase_sauda_id = $1 AND status = 'pending'`,
      [purchase_sauda_id]
    );
    const alreadyReserved = Number(reservedRes.rows[0].reserved);
    const available = remaining - alreadyReserved;

    if (Number(qty) > available) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: `Only ${available} available to indent on this tranche (${alreadyReserved} already reserved by other pending indents)` },
        { status: 400 }
      );
    }

    const inserted = await client.query(
      `INSERT INTO indent_sauda (purchase_sauda_id, qty, created_by, notes)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [purchase_sauda_id, qty, user.name, notes ?? null]
    );

    await client.query("COMMIT");
    return NextResponse.json(inserted.rows[0]);
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("indent-sauda POST failed:", err);
    return NextResponse.json({ error: err?.message ?? "Unexpected server error" }, { status: 500 });
  } finally {
    client.release();
  }
}
