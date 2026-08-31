import type { ReactNode } from "react";

import { Header } from "@/components/header";
import { ThemeSwitch } from "@/components/theme-switch";

/**
 * Marketing layout.
 *
 * The landing page keeps the header, theme switch and decorative frame. These
 * used to live in the root layout, which meant every dashboard route inherited
 * them and rendered a second navigation above its own.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="site-frame site-frame--top" aria-hidden="true" />
      <div className="site-frame site-frame--bottom" aria-hidden="true" />
      <div className="site-frame site-frame--left" aria-hidden="true" />
      <div className="site-frame site-frame--right" aria-hidden="true" />

      <Header />
      <ThemeSwitch />
      {children}
    </>
  );
}
