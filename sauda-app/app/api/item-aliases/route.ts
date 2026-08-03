export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("company_id");
  const rows = companyId
    ? await query(
        `SELECT ia.id, ia.alias, ia.item_id, i.name AS item_name
         FROM item_aliases ia JOIN items i ON i.id = ia.item_id
         WHERE ia.company_id = $1 ORDER BY ia.alias`,
        [companyId]
      )
    : await query(
        `SELECT ia.id, ia.alias, ia.item_id, i.name AS item_name, ia.company_id
         FROM item_aliases ia JOIN items i ON i.id = ia.item_id ORDER BY ia.alias`
      );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = getSessionUser();
  if (!user || (user.role !== "purchase" && user.role !== "admin")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { alias, item_id, company_id } = await req.json();
  if (!alias || !item_id || !company_id) {
    return NextResponse.json({ error: "alias, item_id and company_id are required" }, { status: 400 });
  }

  const rows = await query(
    `INSERT INTO item_aliases (alias, item_id, company_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (alias, company_id) DO UPDATE SET item_id = EXCLUDED.item_id
     RETURNING *`,
    [alias.trim(), item_id, company_id]
  );

  return NextResponse.json(rows[0]);
}
