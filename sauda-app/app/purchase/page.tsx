"use client";

import { useEffect, useState } from "react";
import LogoutButton from "@/app/components/LogoutButton";

type Company = { id: number; name: string };
type Item = { id: number; name: string; company_id: number; category: string | null };
type Sauda = {
  id: number;
  company_name: string;
  item_name: string;
  qty: string;
  dispatched_qty: string;
  remaining_qty: string;
  rate: string;
  location: string;
  status: string;
  booking_date: string;
  expiry_date: string;
};

export default function PurchasePage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [list, setList] = useState<Sauda[]>([]);

  const [companyId, setCompanyId] = useState("");
  const [category, setCategory] = useState("");
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("");
  const [rate, setRate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("7 day");
  const [liftingDays, setLiftingDays] = useState("21");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/companies").then((r) => r.json()).then(setCompanies);
    refreshList();
  }, []);

  useEffect(() => {
    if (!companyId) {
      setItems([]);
      return;
    }
    fetch(`/api/items?company_id=${companyId}`).then((r) => r.json()).then(setItems);
    setItemId("");
    setCategory("");
  }, [companyId]);

  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[];
  const filteredItems = category ? items.filter((i) => i.category === category) : items;

  function refreshList() {
    fetch("/api/purchase-sauda").then((r) => r.json()).then(setList);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!companyId || !itemId || !qty || !rate) {
      setError("Fill company, item, quantity and rate");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/purchase-sauda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: Number(companyId),
          item_id: Number(itemId),
          qty: Number(qty),
          rate: Number(rate),
          payment_terms: paymentTerms,
          lifting_days: Number(liftingDays),
          location,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save");
        return;
      }
      setQty("");
      setRate("");
      setNotes("");
      refreshList();
    } catch {
      setError("Could not reach the server — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium">Purchase sauda</h1>
          <p className="text-sm text-gray-500">Booked against client companies</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/dispatch-upload" className="border border-gray-300 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap">
            Upload dispatch
          </a>
          <LogoutButton />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600">Client company</label>
            <select className="w-full border border-gray-300 rounded-md px-2 py-2 mt-1" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">Select</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Category</label>
            <select className="w-full border border-gray-300 rounded-md px-2 py-2 mt-1" value={category} onChange={(e) => { setCategory(e.target.value); setItemId(""); }} disabled={!companyId}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Item</label>
            <select className="w-full border border-gray-300 rounded-md px-2 py-2 mt-1" value={itemId} onChange={(e) => setItemId(e.target.value)} disabled={!companyId}>
              <option value="">Select</option>
              {filteredItems.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Quantity</label>
            <input type="number" className="w-full border border-gray-300 rounded-md px-2 py-2 mt-1" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-gray-600">Rate</label>
            <input type="number" className="w-full border border-gray-300 rounded-md px-2 py-2 mt-1" value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-gray-600">Payment terms</label>
            <input className="w-full border border-gray-300 rounded-md px-2 py-2 mt-1" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-gray-600">Lifting window (days)</label>
            <select className="w-full border border-gray-300 rounded-md px-2 py-2 mt-1" value={liftingDays} onChange={(e) => setLiftingDays(e.target.value)}>
              <option value="21">21 days</option>
              <option value="30">30 days</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Location</label>
            <input className="w-full border border-gray-300 rounded-md px-2 py-2 mt-1" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Jejuri / Mumbai / Nagpur" />
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-600">Notes</label>
          <input className="w-full border border-gray-300 rounded-md px-2 py-2 mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button disabled={saving} className="w-full bg-gray-900 text-white rounded-md py-2 font-medium disabled:opacity-50">
          {saving ? "Booking..." : "Book purchase sauda"}
        </button>
      </form>

      <div>
        <h2 className="text-sm font-medium text-gray-600 mb-2">Recent bookings (each row is one tranche)</h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-left">
              <tr>
                <th className="p-2">Company</th>
                <th className="p-2">Item</th>
                <th className="p-2">Rate</th>
                <th className="p-2">Booked</th>
                <th className="p-2">Remaining</th>
                <th className="p-2">Expiry</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => {
                const daysLeft = Math.ceil((new Date(s.expiry_date).getTime() - Date.now()) / 86400000);
                const expiringSoon = daysLeft <= 3 && daysLeft >= 0 && Number(s.remaining_qty) > 0;
                const expired = daysLeft < 0 && Number(s.remaining_qty) > 0;
                return (
                  <tr key={s.id} className="border-t border-gray-100">
                    <td className="p-2">{s.company_name}</td>
                    <td className="p-2">{s.item_name}</td>
                    <td className="p-2">₹{s.rate}</td>
                    <td className="p-2">{s.qty}</td>
                    <td className="p-2 font-medium">{s.remaining_qty}</td>
                    <td className={`p-2 ${expiringSoon || expired ? "text-red-600 font-medium" : ""}`}>
                      {s.expiry_date?.slice(0, 10)}
                    </td>
                    <td className="p-2">{s.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
