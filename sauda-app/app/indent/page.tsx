"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/app/components/AppHeader";

type Company = { id: number; name: string };
type Tranche = {
  id: number;
  company_name: string;
  item_name: string;
  rate: string;
  qty: string;
  remaining_qty: string;
  available_to_indent: string;
  expiry_date: string;
};
type Indent = {
  id: number;
  company_name: string;
  item_name: string;
  rate: string;
  qty: string;
  status: string;
  indent_date: string;
  expiry_date: string;
};

export default function IndentPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [list, setList] = useState<Indent[]>([]);

  const [companyId, setCompanyId] = useState("");
  const [trancheId, setTrancheId] = useState("");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/companies").then((r) => r.json()).then(setCompanies);
    refreshList();
  }, []);

  useEffect(() => {
    if (!companyId) return setTranches([]);
    fetch(`/api/purchase-sauda/open?company_id=${companyId}`).then((r) => r.json()).then(setTranches);
    setTrancheId("");
  }, [companyId]);

  function refreshList() {
    fetch("/api/indent-sauda").then((r) => r.json()).then(setList);
  }

  const selectedTranche = tranches.find((t) => String(t.id) === trancheId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!trancheId || !qty) {
      setError("Select a tranche and enter a quantity");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/indent-sauda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchase_sauda_id: Number(trancheId), qty: Number(qty), notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save");
        return;
      }
      setQty("");
      setNotes("");
      // refresh tranche availability since this indent just consumed some of it
      fetch(`/api/purchase-sauda/open?company_id=${companyId}`).then((r) => r.json()).then(setTranches);
      refreshList();
    } catch {
      setError("Could not reach the server — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(id: number) {
    if (!confirm("Cancel this indent? The reserved quantity becomes available again.")) return;
    await fetch(`/api/indent-sauda/${id}/cancel`, { method: "POST" });
    refreshList();
    if (companyId) fetch(`/api/purchase-sauda/open?company_id=${companyId}`).then((r) => r.json()).then(setTranches);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <AppHeader subtitle="Indent sauda" />
      <main className="max-w-2xl mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Indent sauda</h1>
          <p className="text-sm text-slate-500">
            Reserve quantity against an open purchase tranche, ahead of actual dispatch.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div>
            <label className="text-sm text-gray-600">Client company</label>
            <select
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-2.5 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0f2942]/20 focus:border-[#0f2942]"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              <option value="">Select</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600">Tranche (item @ rate)</label>
            <select
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-2.5 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0f2942]/20 focus:border-[#0f2942]"
              value={trancheId}
              onChange={(e) => setTrancheId(e.target.value)}
              disabled={!companyId}
            >
              <option value="">Select</option>
              {tranches.map((t) => (
                <option key={t.id} value={t.id} disabled={Number(t.available_to_indent) <= 0}>
                  {t.item_name} @ ₹{t.rate} — {t.available_to_indent} available (exp {t.expiry_date?.slice(0, 10)})
                </option>
              ))}
            </select>
          </div>

          {selectedTranche && (
            <p className="text-xs text-slate-500">
              Booked {selectedTranche.qty} · Remaining {selectedTranche.remaining_qty} · Available to indent{" "}
              <span className="font-medium text-slate-700">{selectedTranche.available_to_indent}</span>
            </p>
          )}

          <div>
            <label className="text-sm text-gray-600">Quantity to indent</label>
            <input
              type="number"
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-2.5 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0f2942]/20 focus:border-[#0f2942]"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Notes</label>
            <input
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-2.5 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0f2942]/20 focus:border-[#0f2942]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button disabled={saving} className="w-full bg-[#0f2942] text-white rounded-lg py-2.5 font-medium hover:bg-[#16385a] transition-colors disabled:opacity-50">
            {saving ? "Saving..." : "Create indent"}
          </button>
        </form>

        <div>
          <h2 className="text-sm font-medium text-gray-600 mb-2">Recent indents</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-gray-500 text-left">
                <tr>
                  <th className="p-2">Company</th>
                  <th className="p-2">Item</th>
                  <th className="p-2">Rate</th>
                  <th className="p-2">Qty</th>
                  <th className="p-2">Status</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((ind) => (
                  <tr key={ind.id} className="border-t border-gray-100">
                    <td className="p-2">{ind.company_name}</td>
                    <td className="p-2">{ind.item_name}</td>
                    <td className="p-2">₹{ind.rate}</td>
                    <td className="p-2">{ind.qty}</td>
                    <td className="p-2">{ind.status}</td>
                    <td className="p-2">
                      {ind.status === "pending" && (
                        <button onClick={() => handleCancel(ind.id)} className="text-red-600 text-xs">
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
