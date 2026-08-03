export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const lifts = await query(
    `SELECT id, qty, lift_date, truck_no, invoice_no, created_by, created_at
     FROM purchase_lifts
     WHERE purchase_sauda_id = $1
     ORDER BY lift_date ASC, id ASC`,
    [params.id]
  );

  return NextResponse.json(lifts);
}
