import type { ReactNode } from "react";

import { Sidebar } from "@/components/vouch/sidebar";

/**
 * Application shell.
 *
 * A lit substrate, a floating glass rail, and the content offset past it. The
 * atmosphere is not decoration: glass is only worth having when there is
 * something behind it worth bending, and a blur over a flat fill produces
 * banding rather than depth. The wash gives the rail and every panel something
 * real to refract, and the grain over it keeps a gradient that wide from
 * banding.
 *
 * Nothing sits above the content. There is no top navigation at any width --
 * under lg the same rail opens as a drawer rather than being swapped for a
 * separate header, since two navigations built separately drift and the mobile
 * one is always the one that rots.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] bg-[var(--vouch-bg)]">
      {/* Both layers are fixed and inert, so they never repaint with the scroll
          and never intercept a pointer. */}
      <div className="atmosphere" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <Sidebar />

      <main id="main-content" className="relative z-10 lg:pl-[248px]">
        <div className="mx-auto w-full max-w-[1120px] px-5 py-14 sm:px-10 sm:py-20">{children}</div>
      </main>
    </div>
  );
}
