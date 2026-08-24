"use client";

import { BarChart3, LogOut, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";

import ToolTabs from "@/components/shell/tool-tabs";
import type { Role } from "@/lib/session";

export default function ToolsShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const router = useRouter();

  // A client sees one tool, so the masthead names that tool rather than
  // advertising two others they cannot open. "Internal Tools" would be a
  // plainly wrong thing to show somebody external, too.
  const isClient = role === "client";
  const MastheadIcon = isClient ? BarChart3 : Wrench;

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="pill-root pb-24 pt-16">
      <div className="mx-auto max-w-[1760px] px-6">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xl shadow-blue-200">
              <MastheadIcon className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                {isClient ? "HFSE Recruitment Reports" : "HFSE Internal Tools"}
              </h1>
              <p className="text-sm font-bold uppercase tracking-widest text-blue-500">
                {isClient ? "Hiring Performance" : "Reports · Links · Bulk Email"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 shadow-sm transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-600">
            <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Logout
          </button>
        </header>

        <ToolTabs role={role} />
        {children}
      </div>
    </div>
  );
}
