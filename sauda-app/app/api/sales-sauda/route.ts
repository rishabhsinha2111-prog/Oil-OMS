export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Sales reps see only their own bookings. Admin sees everything.
  const rows =
    user.role === "admin"
      ? await query(
          `SELECT ss.*, p.name AS party_name, i.name AS item_name
           FROM sales_sauda ss
           JOIN parties p ON p.id = ss.party_id
           JOIN items i ON i.id = ss.item_id
           ORDER BY ss.created_at DESC`
        )
      : await query(
          `SELECT ss.*, p.name AS party_name, i.name AS item_name
           FROM sales_sauda ss
           JOIN parties p ON p.id = ss.party_id
           JOIN items i ON i.id = ss.item_id
           WHERE ss.created_by = $1
           ORDER BY ss.created_at DESC`,
          [user.name]
        );

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = getSessionUser();
  if (!user || (user.role !== "sales" && user.role !== "admin")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { party_id, item_id, qty, rate, payment_terms, location, booking_date, notes } =
    await req.json();

  if (!party_id || !item_id || !qty || !rate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const rows = await query(
    `INSERT INTO sales_sauda
      (party_id, item_id, qty, rate, payment_terms, location, booking_date, created_by, notes)
     VALUES ($1,$2,$3,$4,$5,$6, COALESCE($7, CURRENT_DATE), $8, $9)
     RETURNING *`,
    [party_id, item_id, qty, rate, payment_terms ?? null, location ?? null, booking_date ?? null, user.name, notes ?? null]
  );

  return NextResponse.json(rows[0]);
}
