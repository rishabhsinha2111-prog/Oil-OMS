"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/app/components/AppHeader";

type Row = {
  id: number;
  type: "purchase" | "sales";
  counterparty: string;
  item: string;
  qty: string;
  fulfilled_qty: string;
  pending_qty: string;
  rate: string;
  location: string;
  status: string;
  booking_date: string;
  created_by: string;
};

export default function PendingPage() {
  const [purchase, setPurchase] = useState<Row[]>([]);
  const [sales, setSales] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"all" | "purchase" | "sales">("all");

  useEffect(() => {
    fetch("/api/pending")
      .then((r) => r.json())
      .then((data) => {
        setPurchase(data.purchase ?? []);
        setSales(data.sales ?? []);
      });
  }, []);

  const rows = [
    ...(filter !== "sales" ? purchase : []),
    ...(filter !== "purchase" ? sales : []),
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <AppHeader subtitle="Pending sauda" />
      <main className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Pending sauda</h1>
          <p className="text-sm text-slate-500">Live view across purchase and sales</p>
        </div>
        <a href="/api/export" className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          Export report
        </a>
      </div>

      <div className="flex gap-2">
        {(["all", "purchase", "sales"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-sm px-3 py-1 rounded-md border ${filter === f ? "bg-gray-900 text-white border-gray-900" : "border-gray-300"}`}
          >
            {f === "all" ? "All" : f === "purchase" ? "Purchase" : "Sales"}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-gray-500 text-left">
            <tr>
              <th className="p-2">Type</th>
              <th className="p-2">Counterparty</th>
              <th className="p-2">Item</th>
              <th className="p-2">Booked</th>
              <th className="p-2">Fulfilled</th>
              <th className="p-2">Pending</th>
              <th className="p-2">By</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.type}-${r.id}`} className="border-t border-gray-100">
                <td className="p-2 capitalize">{r.type}</td>
                <td className="p-2">{r.counterparty}</td>
                <td className="p-2">{r.item}</td>
                <td className="p-2">{r.qty}</td>
                <td className="p-2">{r.fulfilled_qty}</td>
                <td className="p-2 font-medium">{r.pending_qty}</td>
                <td className="p-2 text-gray-500">{r.created_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </main>
    </div>
  );
}
