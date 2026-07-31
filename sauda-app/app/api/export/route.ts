export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import * as XLSX from "xlsx";

export async function GET() {
  const user = getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const purchase = await query<any>(
    `SELECT c.name AS company, i.name AS item, ps.qty AS booked,
            ps.dispatched_qty AS dispatched, (ps.qty - ps.dispatched_qty) AS pending,
            ps.rate, ps.location, ps.status, ps.booking_date
     FROM purchase_sauda ps
     JOIN companies c ON c.id = ps.company_id
     JOIN items i ON i.id = ps.item_id
     ORDER BY c.name, i.name`
  );

  const sales = await query<any>(
    `SELECT p.name AS party, i.name AS item, ss.qty AS booked,
            ss.sold_qty AS sold, (ss.qty - ss.sold_qty) AS pending,
            ss.rate, ss.location, ss.status, ss.booking_date
     FROM sales_sauda ss
     JOIN parties p ON p.id = ss.party_id
     JOIN items i ON i.id = ss.item_id
     ORDER BY p.name, i.name`
  );

  const wb = XLSX.utils.book_new();

  const purchaseSheet = XLSX.utils.json_to_sheet(
    purchase.map((r) => ({
      "Client company": r.company,
      Product: r.item,
      Booked: Number(r.booked),
      Dispatched: Number(r.dispatched),
      Pending: Number(r.pending),
      Rate: Number(r.rate),
      Location: r.location,
      Status: r.status,
      "Booking date": r.booking_date,
    }))
  );
  XLSX.utils.book_append_sheet(wb, purchaseSheet, "Purchase Sauda");

  const salesSheet = XLSX.utils.json_to_sheet(
    sales.map((r) => ({
      Party: r.party,
      Product: r.item,
      Booked: Number(r.booked),
      Sold: Number(r.sold),
      Pending: Number(r.pending),
      Rate: Number(r.rate),
      Location: r.location,
      Status: r.status,
      "Booking date": r.booking_date,
    }))
  );
  XLSX.utils.book_append_sheet(wb, salesSheet, "Sales Sauda");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Pending_Sauda_Report_${today}.xlsx"`,
    },
  });
}
