"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/app/components/AppHeader";

type Company = { id: number; name: string };
type Item = { id: number; name: string };
type Result = {
  rowsTotal: number;
  rowsMatched: number;
  unmatchedProducts: string[];
  rateMismatches: string[];
};

export default function DispatchUploadPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [aliasChoice, setAliasChoice] = useState<Record<string, string>>({});
  const [savingAlias, setSavingAlias] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/companies").then((r) => r.json()).then(setCompanies);
  }, []);

  useEffect(() => {
    if (!companyId) return setItems([]);
    fetch(`/api/items?company_id=${companyId}`).then((r) => r.json()).then(setItems);
  }, [companyId]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setResolved(new Set());
    if (!companyId || !file) {
      setError("Choose a company and a file");
      return;
    }
    setUploading(true);
    try {
      const arrayBuf = await file.arrayBuffer();
      const base64 = btoa(new Uint8Array(arrayBuf).reduce((s, b) => s + String.fromCharCode(b), ""));

      const res = await fetch("/api/dispatch-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: Number(companyId), file_name: file.name, file_base64: base64 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setResult(data);
    } finally {
      setUploading(false);
    }
  }

  async function saveAlias(product: string) {
    const itemId = aliasChoice[product];
    if (!itemId) return;
    setSavingAlias(product);
    try {
      await fetch("/api/item-aliases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias: product, item_id: Number(itemId), company_id: Number(companyId) }),
      });
      setResolved((prev) => new Set(prev).add(product));
    } finally {
      setSavingAlias(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <AppHeader subtitle="Daily dispatch upload" />
      <main className="max-w-2xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Daily dispatch upload</h1>
        <p className="text-sm text-slate-500">
          Upload the dispatch Excel from today&apos;s mail. Each row is matched to the tranche booked
          at that exact product + rate — not just the oldest open one.
        </p>
      </div>

      <form onSubmit={handleUpload} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div>
          <label className="text-sm text-gray-600">Client company</label>
          <select className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-2.5 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0f2942]/20 focus:border-[#0f2942]" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            <option value="">Select</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-600">Dispatch file (.xlsx)</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-2.5 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0f2942]/20 focus:border-[#0f2942]"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button disabled={uploading} className="w-full bg-[#0f2942] text-white rounded-lg py-2.5 font-medium hover:bg-[#16385a] transition-colors disabled:opacity-50">
          {uploading ? "Processing..." : "Upload and reconcile"}
        </button>
      </form>

      {result && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <p className="text-sm">
            <span className="font-medium">{result.rowsMatched}</span> of {result.rowsTotal} rows matched and applied to a tranche.
          </p>

          {result.unmatchedProducts.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-amber-700">
                {result.unmatchedProducts.length} product name(s) not recognized — map each to the right item, once.
              </p>
              {result.unmatchedProducts.map((product) => (
                <div key={product} className="border border-gray-200 rounded-md p-2 flex items-center gap-2">
                  <span className="text-sm flex-1">{product}</span>
                  {resolved.has(product) ? (
                    <span className="text-xs text-green-600">Saved</span>
                  ) : (
                    <>
                      <select
                        className="bg-white text-slate-900 border border-slate-300 rounded-lg px-2 py-1 text-sm"
                        value={aliasChoice[product] ?? ""}
                        onChange={(e) => setAliasChoice((prev) => ({ ...prev, [product]: e.target.value }))}
                      >
                        <option value="">Map to item...</option>
                        {items.map((i) => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={savingAlias === product}
                        onClick={() => saveAlias(product)}
                        className="text-xs border border-gray-300 rounded-md px-2 py-1"
                      >
                        Save
                      </button>
                    </>
                  )}
                </div>
              ))}
              <p className="text-xs text-gray-500">
                Mapped aliases apply going forward — re-upload this file after saving mappings to apply this batch too.
              </p>
            </div>
          )}

          {result.rateMismatches.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-red-700 font-medium">
                {result.rateMismatches.length} row(s) couldn&apos;t be matched to an open tranche at that rate:
              </p>
              <ul className="text-sm text-red-700 list-disc pl-5 space-y-1">
                {result.rateMismatches.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
              <p className="text-xs text-gray-500">
                This usually means either the purchase sauda for this rate wasn&apos;t booked yet, or the rate
                on the dispatch file doesn&apos;t exactly match a booked tranche — worth checking Ganesh&apos;s
                bookings before assuming it&apos;s a data error.
              </p>
            </div>
          )}
        </div>
      )}
      </main>
    </div>
  );
}
