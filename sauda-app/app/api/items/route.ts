export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// Items are strictly mapped to one client company each.
// ?company_id= filters the picker so a sales rep only ever sees items
// that legitimately belong to the company they're routing stock from.
export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("company_id");

  const rows = companyId
    ? await query(
        `SELECT id, name, category, company_id FROM items WHERE active = true AND company_id = $1 ORDER BY name`,
        [companyId]
      )
    : await query(
        `SELECT id, name, category, company_id FROM items WHERE active = true ORDER BY name`
      );

  return NextResponse.json(rows);
}
