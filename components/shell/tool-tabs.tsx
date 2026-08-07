"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BarChart3, Link2, Mail } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TOOLS = [
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/links", label: "Link Generator", icon: Link2 },
  { href: "/bulk-email", label: "Bulk Email", icon: Mail },
] as const;

export default function ToolTabs() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <nav aria-label="Tools" className="custom-scrollbar -mx-1 overflow-x-auto px-1 pb-1">
      <ul className="inline-flex gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {TOOLS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex items-center gap-2 whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-bold transition-colors ${
                  isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-800"
                }`}>
                {isActive && (
                  <motion.span
                    layoutId="tool-tab-active"
                    className="absolute inset-0 -z-10 rounded-lg bg-blue-50"
                    transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
