export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { setSessionCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { name, pin } = await req.json();

  if (!name || !pin) {
    return NextResponse.json({ error: "Name and PIN required" }, { status: 400 });
  }

  const rows = await query<{ id: number; name: string; role: string }>(
    `SELECT id, name, role FROM users WHERE lower(name) = lower($1) AND pin = $2 AND active = true`,
    [name, pin]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Invalid name or PIN" }, { status: 401 });
  }

  const user = rows[0];
  setSessionCookie({ id: user.id, name: user.name, role: user.role as any });

  return NextResponse.json({ ok: true, role: user.role });
}
