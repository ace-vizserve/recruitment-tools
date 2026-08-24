import { cookies } from "next/headers";

import ToolsShell from "@/components/shell/tools-shell";
import { resolveRole } from "@/lib/session";

export default async function ToolsLayout({ children }: { children: React.ReactNode }) {
  // Middleware has already turned away anyone without a valid cookie, so this
  // only decides which tabs to draw. Falling back to the narrower role means
  // an unreadable cookie shows fewer tools rather than more.
  const authCookie = (await cookies()).get("auth_session");
  const role = (await resolveRole(authCookie?.value)) ?? "client";

  return <ToolsShell role={role}>{children}</ToolsShell>;
}
