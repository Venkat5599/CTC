import type { ReactNode } from "react";

import { SideNav } from "@/components/dashboard/side-nav";

/**
 * Dashboard shell.
 *
 * A fixed left rail and a content column offset past it. One navigation, at
 * every width -- the rail becomes a drawer under lg rather than being replaced
 * by a second nav that can drift out of sync with the first.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <SideNav />
      <main id="main-content" className="lg:pl-52">
        <div className="mx-auto w-full max-w-[1100px] px-5 py-10 sm:px-8 sm:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
