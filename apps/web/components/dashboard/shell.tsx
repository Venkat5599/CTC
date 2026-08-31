import type { ReactNode } from "react";

import { SideNav } from "@/components/dashboard/side-nav";

/**
 * Dashboard shell.
 *
 * A fixed left rail with the content offset past it. One navigation at every
 * width -- under lg the rail becomes a drawer rather than being swapped for a
 * separate mobile nav, since two navs built separately drift and the mobile one
 * is always the one that rots.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background min-h-[100dvh]">
      <SideNav />
      <main id="main-content" className="lg:pl-56">
        <div className="mx-auto w-full max-w-[1080px] px-5 py-10 sm:px-8 sm:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
