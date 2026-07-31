export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Purchase side is Ganesh's own bookings unless you're admin (full visibility)
  const rows =
    user.role === "admin"
      ? await query(
          `SELECT ps.*, c.name AS company_name, i.name AS item_name
           FROM purchase_sauda ps
           JOIN companies c ON c.id = ps.company_id
           JOIN items i ON i.id = ps.item_id
           ORDER BY ps.created_at DESC`
        )
      : await query(
          `SELECT ps.*, c.name AS company_name, i.name AS item_name
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

  const { company_id, item_id, qty, rate, payment_terms, location, booking_date, notes } =
    await req.json();

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

  const rows = await query(
    `INSERT INTO purchase_sauda
      (company_id, item_id, qty, rate, payment_terms, location, booking_date, created_by, notes)
     VALUES ($1,$2,$3,$4,$5,$6, COALESCE($7, CURRENT_DATE), $8, $9)
     RETURNING *`,
    [company_id, item_id, qty, rate, payment_terms ?? null, location ?? null, booking_date ?? null, user.name, notes ?? null]
  );

  return NextResponse.json(rows[0]);
}
