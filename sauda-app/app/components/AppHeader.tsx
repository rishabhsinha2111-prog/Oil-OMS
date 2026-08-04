"use client";

import { useEffect, useState } from "react";
import LogoutButton from "@/app/components/LogoutButton";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  purchase: "Purchase",
  sales: "Sales",
};

const ROLE_COLOR: Record<string, string> = {
  admin: "bg-indigo-600",
  purchase: "bg-amber-600",
  sales: "bg-emerald-600",
};

export default function AppHeader({ subtitle }: { subtitle?: string }) {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  return (
    <header className="bg-[#0f2942] text-white">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight">RMC Oil Sauda</span>
            <span className="text-xs text-slate-400">Oil division</span>
          </div>
          {subtitle && <p className="text-xs text-slate-300 mt-0.5">{subtitle}</p>}
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm">{user.name}</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_COLOR[user.role] ?? "bg-slate-600"}`}>
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
            <LogoutButton className="text-sm text-slate-300 underline underline-offset-2 hover:text-white" />
          </div>
        )}
      </div>
    </header>
  );
}
