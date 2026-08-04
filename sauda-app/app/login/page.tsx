"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      if (data.role === "purchase") router.push("/purchase");
      else if (data.role === "sales") router.push("/sales");
      else router.push("/pending");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-8 space-y-5"
      >
        <div className="text-center space-y-1">
          <div className="mx-auto w-12 h-12 rounded-xl bg-[#0f2942] text-white flex items-center justify-center text-lg font-bold">
            RS
          </div>
          <h1 className="text-lg font-semibold text-slate-900">RMC Oil Sauda</h1>
          <p className="text-sm text-slate-500">Sign in to continue</p>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Name</label>
          <input
            className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0f2942]/30 focus:border-[#0f2942]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ganesh"
            autoComplete="off"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">PIN</label>
          <input
            type="password"
            inputMode="numeric"
            className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0f2942]/30 focus:border-[#0f2942]"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="4-digit PIN"
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#0f2942] text-white rounded-lg py-2.5 font-medium disabled:opacity-50 hover:bg-[#16385a] transition-colors"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
