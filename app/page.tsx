"use client";

import ExcelToJson from "@/components/excel-to-json";
import LinkGenerator from "@/components/link-generator";
import { LogOut, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=JetBrains+Mono&display=swap");

        .pill-root {
          font-family: "Poppins", sans-serif;
          background: #f8faff;
          background-image:
            radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.08) 0px, transparent 50%),
            radial-gradient(at 100% 100%, rgba(6, 182, 212, 0.08) 0px, transparent 50%);
          min-height: 100vh;
        }
      `}</style>

      <div className="pill-root pb-24 pt-16">
        <div className="mx-auto max-w-5xl px-6">
          <header className="mb-12 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xl shadow-blue-200">
                <Wrench className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">HFSE Internal Tools</h1>
                <p className="text-sm font-bold text-blue-500 uppercase tracking-widest">Links · Bulk Email · More</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="group flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all shadow-sm">
              <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Logout
            </button>
          </header>

          <ExcelToJson />

          <div className="space-y-8">
            <LinkGenerator />
          </div>
        </div>
      </div>
    </>
  );
}
