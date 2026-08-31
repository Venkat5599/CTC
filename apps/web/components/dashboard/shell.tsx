import type { ReactNode } from "react";

import { Sidebar } from "@/components/vouch/sidebar";

/**
 * Application shell.
 *
 * A fixed left rail with the content offset past it, and nothing above the
 * content. There is no top navigation at any width: under lg the same rail
 * opens as a drawer rather than being swapped for a separate header, since two
 * navigations built separately drift and the mobile one is always the one that
 * rots.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[var(--vouch-bg)]">
      <Sidebar />
      <main id="main-content" className="lg:pl-[232px]">
        <div className="mx-auto w-full max-w-[1080px] px-5 py-10 sm:px-8 sm:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
