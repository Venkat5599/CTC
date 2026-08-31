import type { ReactNode } from "react";

import { TopNav } from "@/components/dashboard/top-nav";

/**
 * Dashboard shell.
 *
 * One navigation, a compact row, and the content gets the width. No sidebar:
 * a persistent rail of module names framed every page as documentation, and it
 * made Passport look like the product rather than one part of it.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background min-h-[100dvh]">
      <TopNav />
      <main id="main-content" className="mx-auto w-full max-w-[1180px] px-5 py-10 sm:px-8 sm:py-12">
        {children}
      </main>
    </div>
  );
}
