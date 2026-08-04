"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/app/components/AppHeader";

type Party = { id: number; name: string; location: string; status: string };
type Item = { id: number; name: string; category: string };
type Sauda = {
  id: number;
  party_name: string;
  item_name: string;
  qty: string;
  sold_qty: string;
  rate: string;
  status: string;
};

export default function SalesPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [list, setList] = useState<Sauda[]>([]);

  const [partyId, setPartyId] = useState("");
  const [newPartyMode, setNewPartyMode] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  const [itemId, setItemId] = useState("");
  const [category, setCategory] = useState("");
  const [qty, setQty] = useState("");
  const [rate, setRate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("7 day");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/parties").then((r) => r.json()).then(setParties);
    fetch("/api/items").then((r) => r.json()).then(setItems);
    refreshList();
  }, []);

  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[];
  const filteredItems = category ? items.filter((i) => i.category === category) : items;

  function refreshList() {
    fetch("/api/sales-sauda").then((r) => r.json()).then(setList);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    let finalPartyId = partyId;

    setSaving(true);
    try {
      if (newPartyMode) {
        if (!newPartyName) {
          setError("Enter the new party's name");
          setSaving(false);
          return;
        }
        const res = await fetch("/api/parties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newPartyName, location }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Could not add party");
          setSaving(false);
          return;
        }
        finalPartyId = String(data.id);
      }

      if (!finalPartyId || !itemId || !qty || !rate) {
        setError("Fill party, item, quantity and rate");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/sales-sauda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          party_id: Number(finalPartyId),
          item_id: Number(itemId),
          qty: Number(qty),
          rate: Number(rate),
          payment_terms: paymentTerms,
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
      setNewPartyMode(false);
      setNewPartyName("");
      fetch("/api/parties").then((r) => r.json()).then(setParties);
      refreshList();
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(id: number) {
    const reason = prompt("Reason for cancelling this sauda?");
    if (!reason) return;
    await fetch(`/api/sales-sauda/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    refreshList();
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <AppHeader subtitle="Sales sauda" />
      <main className="max-w-2xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Sales sauda</h1>
        <p className="text-sm text-slate-500">Your bookings only</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div>
          <label className="text-sm text-gray-600">Party</label>
          {!newPartyMode ? (
            <div className="flex gap-2 mt-1">
              <select className="flex-1 border border-gray-300 rounded-md px-2 py-2" value={partyId} onChange={(e) => setPartyId(e.target.value)}>
                <option value="">Select</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.location ? ` - ${p.location}` : ""}{p.status === "pending_review" ? " (pending review)" : ""}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => setNewPartyMode(true)} className="border border-gray-300 rounded-md px-3 text-sm whitespace-nowrap">
                + New party
              </button>
            </div>
          ) : (
            <div className="flex gap-2 mt-1">
              <input className="flex-1 border border-gray-300 rounded-md px-2 py-2" placeholder="New party name" value={newPartyName} onChange={(e) => setNewPartyName(e.target.value)} />
              <button type="button" onClick={() => setNewPartyMode(false)} className="border border-gray-300 rounded-md px-3 text-sm">
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600">Category</label>
            <select className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-2.5 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0f2942]/20 focus:border-[#0f2942]" value={category} onChange={(e) => { setCategory(e.target.value); setItemId(""); }}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Item</label>
            <select className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-2.5 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0f2942]/20 focus:border-[#0f2942]" value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">Select</option>
              {filteredItems.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Quantity</label>
            <input type="number" className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-2.5 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0f2942]/20 focus:border-[#0f2942]" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-gray-600">Rate</label>
            <input type="number" className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-2.5 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0f2942]/20 focus:border-[#0f2942]" value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-gray-600">Payment terms</label>
            <input className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-2.5 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0f2942]/20 focus:border-[#0f2942]" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="text-sm text-gray-600">Location</label>
            <select className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-2.5 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0f2942]/20 focus:border-[#0f2942]" value={location} onChange={(e) => setLocation(e.target.value)}>
              <option value="">Select</option>
              {["Pune", "Mumbai", "Nashik", "Kolhapur", "Satara", "Nanded", "Chhatrapati Sambhajinagar", "Goa"].map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-600">Notes</label>
          <input className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-2.5 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0f2942]/20 focus:border-[#0f2942]" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button disabled={saving} className="w-full bg-[#0f2942] text-white rounded-lg py-2.5 font-medium hover:bg-[#16385a] transition-colors disabled:opacity-50">
          {saving ? "Booking..." : "Book sales sauda"}
        </button>
      </form>

      <div>
        <h2 className="text-sm font-medium text-gray-600 mb-2">Your recent bookings</h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-left">
              <tr>
                <th className="p-2">Party</th>
                <th className="p-2">Item</th>
                <th className="p-2">Qty</th>
                <th className="p-2">Status</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="p-2">{s.party_name}</td>
                  <td className="p-2">{s.item_name}</td>
                  <td className="p-2">{s.qty}</td>
                  <td className="p-2">{s.status}</td>
                  <td className="p-2">
                    {s.status === "booked" && (
                      <button onClick={() => handleCancel(s.id)} className="text-red-600 text-xs">
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
