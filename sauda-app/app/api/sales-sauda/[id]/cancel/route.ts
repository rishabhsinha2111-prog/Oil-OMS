export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { reason } = await req.json();
  if (!reason) {
    return NextResponse.json({ error: "Cancel reason required" }, { status: 400 });
  }

  // Reps can only cancel their own sauda; admin can cancel any.
  const ownershipClause = user.role === "admin" ? "" : "AND created_by = $3";
  const paramsArr =
    user.role === "admin" ? [params.id, reason] : [params.id, reason, user.name];

  const rows = await query(
    `UPDATE sales_sauda
     SET status = 'cancelled', cancel_reason = $2
     WHERE id = $1 ${ownershipClause}
     RETURNING *`,
    paramsArr
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Sauda not found or not yours to cancel" }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}
