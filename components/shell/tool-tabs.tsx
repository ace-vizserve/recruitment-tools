"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BarChart3, Link2, Mail } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { canAccess } from "@/lib/access";
import type { Role } from "@/lib/session";

const TOOLS = [
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/links", label: "Link Generator", icon: Link2 },
  { href: "/bulk-email", label: "Bulk Email", icon: Mail },
] as const;

export default function ToolTabs({ role }: { role: Role }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  // Filtered through the same predicate the middleware enforces, so the tabs
  // on screen cannot drift from what the server actually allows.
  const tools = TOOLS.filter((tool) => canAccess(role, tool.href));

  // A tab bar offering one tab only raises the question of where the others
  // went. With a single tool the page heading already says where you are.
  if (tools.length < 2) return null;

  return (
    <nav aria-label="Tools" className="custom-scrollbar mb-10 -mx-1 overflow-x-auto px-1 pb-1">
      <ul className="inline-flex gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {tools.map(({ href, label, icon: Icon }) => {
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
