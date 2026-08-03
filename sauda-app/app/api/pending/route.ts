export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const purchase = await query(
    `SELECT ps.id, 'purchase' AS type, c.name AS counterparty, i.name AS item,
            ps.qty, ps.dispatched_qty AS fulfilled_qty, (ps.qty - ps.dispatched_qty) AS pending_qty,
            ps.rate, ps.location, ps.status, ps.booking_date, ps.created_by
     FROM purchase_sauda ps
     JOIN companies c ON c.id = ps.company_id
     JOIN items i ON i.id = ps.item_id
     WHERE ps.status IN ('open','partially_lifted')
     ORDER BY ps.booking_date DESC`
  );

  const sales = await query(
    `SELECT ss.id, 'sales' AS type, p.name AS counterparty, i.name AS item,
            ss.qty, ss.sold_qty AS fulfilled_qty, (ss.qty - ss.sold_qty) AS pending_qty,
            ss.rate, ss.location, ss.status, ss.booking_date, ss.created_by
     FROM sales_sauda ss
     JOIN parties p ON p.id = ss.party_id
     JOIN items i ON i.id = ss.item_id
     WHERE ss.status = 'booked'
     ORDER BY ss.booking_date DESC`
  );

  return NextResponse.json({ purchase, sales });
}
