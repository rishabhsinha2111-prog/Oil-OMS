export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Purchase side is Ganesh's own bookings unless you're admin (full visibility).
  // Each row is one tranche: qty/rate/lifting window are locked at booking time.
  // dispatched_qty is a cache recomputed from purchase_lifts, never edited directly.
  const rows =
    user.role === "admin"
      ? await query(
          `SELECT ps.*, c.name AS company_name, i.name AS item_name,
                  (ps.qty - ps.dispatched_qty) AS remaining_qty
           FROM purchase_sauda ps
           JOIN companies c ON c.id = ps.company_id
           JOIN items i ON i.id = ps.item_id
           ORDER BY ps.created_at DESC`
        )
      : await query(
          `SELECT ps.*, c.name AS company_name, i.name AS item_name,
                  (ps.qty - ps.dispatched_qty) AS remaining_qty
           FROM purchase_sauda ps
           JOIN companies c ON c.id = ps.company_id
           JOIN items i ON i.id = ps.item_id
           WHERE ps.created_by = $1
           ORDER BY ps.created_at DESC`,
          [user.name]
        );

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = getSessionUser();
  if (!user || (user.role !== "purchase" && user.role !== "admin")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const {
    company_id, item_id, qty, rate, payment_terms, location,
    booking_date, lifting_days, notes,
  } = await req.json();

  if (!company_id || !item_id || !qty || !rate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Guard rail: item must actually belong to the selected company (strict mapping)
  const check = await query(
    `SELECT 1 FROM items WHERE id = $1 AND company_id = $2`,
    [item_id, company_id]
  );
  if (check.length === 0) {
    return NextResponse.json(
      { error: "Selected item does not belong to the selected company" },
      { status: 400 }
    );
  }

  const days = lifting_days ? Number(lifting_days) : 21;

  // Each booking is a brand new tranche - even if the same item/company already
  // has open tranches at a different rate. That's expected, not a duplicate.
  const rows = await query(
    `INSERT INTO purchase_sauda
      (company_id, item_id, qty, rate, payment_terms, location, booking_date, lifting_days, expiry_date, created_by, notes)
     VALUES ($1,$2,$3,$4,$5,$6, COALESCE($7, CURRENT_DATE), $8,
             COALESCE($7, CURRENT_DATE) + ($8 || ' days')::interval, $9, $10)
     RETURNING *`,
    [company_id, item_id, qty, rate, payment_terms ?? null, location ?? null, booking_date ?? null, days, user.name, notes ?? null]
  );

  return NextResponse.json(rows[0]);
}
