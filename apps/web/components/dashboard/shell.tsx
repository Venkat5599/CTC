import type { ReactNode } from "react";

import { TopNav } from "@/components/dashboard/top-nav";

/**
 * Dashboard shell.
 *
 * One layout for every inner route. The sidebar is gone: navigation is a single
 * compact row and the content gets the width, which is the difference between a
 * product and a documentation site.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <TopNav />
      <main id="main-content" className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6 sm:py-12">
        {children}
      </main>
    </div>
  );
}
