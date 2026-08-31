import type { ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/shell";

/**
 * Layout for the application routes.
 *
 * A route group rather than a path segment, so /passport stays /passport.
 * Navigation is a presentation decision and should not have rewritten every URL.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
