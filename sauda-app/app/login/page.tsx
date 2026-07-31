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
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white border border-gray-200 rounded-xl p-6 space-y-4"
      >
        <div>
          <h1 className="text-lg font-medium">RMC Oil Sauda</h1>
          <p className="text-sm text-gray-500">Sign in to continue</p>
        </div>

        <div>
          <label className="text-sm text-gray-600">Name</label>
          <input
            className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ganesh"
            required
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">PIN</label>
          <input
            type="password"
            inputMode="numeric"
            className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
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
          className="w-full bg-gray-900 text-white rounded-md py-2 font-medium disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
