import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";

/**
 * Layout for the application routes.
 *
 * A route group rather than a path segment, so these keep their URLs -- the
 * sidebar is a presentation decision and should not have moved /passport to
 * /app/passport. Links published anywhere still resolve.
 */
export default function AppLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="py-10 md:py-14">
      <AppShell>{children}</AppShell>
    </div>
  );
}
