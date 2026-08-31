"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { features } from "@/lib/config";

/**
 * Lenis configuration options.
 * See: https://github.com/darkroomengineering/lenis#options
 */
const LENIS_OPTIONS = {
  duration: 1.6,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: "vertical" as const,
  gestureOrientation: "vertical" as const,
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 2,
};

/**
 * Routes that must never have their scroll hijacked.
 *
 * Momentum scrolling suits a marketing page you read top to bottom. In the
 * application it fights the user: scanning a table, jumping to a row, landing on
 * an anchored proof all want the scroll position the operating system gave you,
 * arriving immediately. Enterprise tools do not animate the scrollbar.
 */
const APP_ROUTES = [
  "/dashboard",
  "/explorer",
  "/proofs",
  "/apps",
  "/credit",
  "/developers",
  "/docs",
  "/passport",
  "/verify",
];

export function SmoothScroll({ children }: { children: ReactNode }): ReactNode {
  const pathname = usePathname();
  const isApp = APP_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  useEffect(() => {
    if (!features.smoothScroll || isApp) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    const lenis = new Lenis(LENIS_OPTIONS);

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Handle anchor link clicks
    function handleAnchorClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;

      const element = document.querySelector(href);
      if (!element) return;

      e.preventDefault();
      lenis.scrollTo(element as HTMLElement, { offset: -100 });
    }

    document.addEventListener('click', handleAnchorClick);

    return () => {
      document.removeEventListener('click', handleAnchorClick);
      lenis.destroy();
    };
  }, [isApp]);

  return <>{children}</>;
}
