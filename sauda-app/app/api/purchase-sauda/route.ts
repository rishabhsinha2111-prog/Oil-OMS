export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

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

  try {
    const {
      company_id, item_id, qty, rate, payment_terms, location,
      booking_date, lifting_days, notes,
    } = await req.json();

    if (!company_id || !item_id || !qty || !rate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

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

    // Compute the actual date values in JS rather than inside a parameterized
    // SQL interval expression - avoids Postgres type-inference issues with
    // integer/text concatenation through a driver-typed parameter.
    const bookingDateObj = booking_date ? new Date(booking_date) : new Date();
    const expiryDateObj = new Date(bookingDateObj);
    expiryDateObj.setDate(expiryDateObj.getDate() + days);

    const toISODate = (d: Date) => d.toISOString().slice(0, 10);

    const rows = await query(
      `INSERT INTO purchase_sauda
        (company_id, item_id, qty, rate, payment_terms, location, booking_date, lifting_days, expiry_date, created_by, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        company_id, item_id, qty, rate, payment_terms ?? null, location ?? null,
        toISODate(bookingDateObj), days, toISODate(expiryDateObj), user.name, notes ?? null,
      ]
    );

    return NextResponse.json(rows[0]);
  } catch (err: any) {
    console.error("purchase-sauda POST failed:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected server error while saving purchase sauda" },
      { status: 500 }
    );
  }
}
