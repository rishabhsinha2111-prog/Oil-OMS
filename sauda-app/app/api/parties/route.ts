export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const rows = await query(
    `SELECT id, name, location, status FROM parties ORDER BY name`
  );
  return NextResponse.json(rows);
}

// Quick-add from the Sales Sauda entry form.
// New parties land as pending_review so they don't silently pollute the master -
// an admin/Ganesh confirms them later.
export async function POST(req: NextRequest) {
  const user = getSessionUser();
  if (!user || user.role === "purchase") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { name, location } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Party name required" }, { status: 400 });
  }

  const rows = await query(
    `INSERT INTO parties (name, location, status, created_by)
     VALUES ($1, $2, 'pending_review', $3)
     ON CONFLICT (name, location) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name, location, status`,
    [name, location ?? null, user.name]
  );

  return NextResponse.json(rows[0]);
}
