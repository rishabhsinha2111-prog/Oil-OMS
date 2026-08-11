export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const companyId = req.nextUrl.searchParams.get("company_id");

  const rows = await query(
    `SELECT ps.id, ps.rate, ps.qty, ps.dispatched_qty, ps.expiry_date, ps.booking_date,
            c.name AS company_name, i.name AS item_name,
            (ps.qty - ps.dispatched_qty) AS remaining_qty,
            (ps.qty - ps.dispatched_qty - COALESCE(res.reserved, 0)) AS available_to_indent
     FROM purchase_sauda ps
     JOIN companies c ON c.id = ps.company_id
     JOIN items i ON i.id = ps.item_id
     LEFT JOIN (
       SELECT purchase_sauda_id, SUM(qty) AS reserved
       FROM indent_sauda WHERE status = 'pending'
       GROUP BY purchase_sauda_id
     ) res ON res.purchase_sauda_id = ps.id
     WHERE ps.status IN ('open','partially_lifted')
       ${companyId ? "AND ps.company_id = $1" : ""}
     ORDER BY ps.booking_date ASC`,
    companyId ? [companyId] : []
  );

  return NextResponse.json(rows);
}
