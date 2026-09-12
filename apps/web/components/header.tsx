"use client";

import { ArrowDownRight, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";

/**
 * Navigation.
 *
 * Every entry points at a route that exists. The template shipped Analytics,
 * Automation, Integrations and Case Studies -- all of them dead links to pages
 * that were never built, which is the fastest way to make a site feel like a
 * mockup.
 */
const menus = {
  products: [
    {
      label: "Passport",
      href: "/passport",
      description: "Standing for any address",
    },
    {
      label: "Proofs",
      href: "/proofs",
      description: "Every verified fact, traceable to both chains",
    },
    {
      label: "Consumers",
      href: "/apps",
      description: "Three applications, one registry",
    },
    {
      label: "Credit",
      href: "/credit",
      description: "Collateral priced from proven history",
    },
  ],
  resources: [
    {
      label: "Developers",
      href: "/developers",
      description: "Integrate in one view call",
    },
    {
      label: "Verification",
      href: "/verify",
      description: "Watch a fact move through the pipeline",
    },
    {
      label: "Threat model",
      href: "https://github.com/Venkat5599/CTC/blob/master/docs/security/threat-model.md",
      description: "The three failure modes and their tests",
    },
    {
      label: "Source",
      href: "https://github.com/Venkat5599/CTC",
      description: "Contracts, services, and 128 passing tests",
    },
  ],
};

const ease = [0.23, 1, 0.32, 1] as const;

function HamburgerIcon({ isOpen }: { isOpen: boolean }): ReactNode {
  return (
    <div className="relative flex h-4 w-8 cursor-pointer flex-col justify-between">
      <motion.span
        className="bg-foreground block h-0.5 w-full origin-center rounded-full"
        animate={isOpen ? { rotate: 45, y: 4.5 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.25, ease }}
      />
      <motion.span
        className="bg-foreground block h-0.5 w-full origin-center rounded-full"
        animate={isOpen ? { rotate: -45, y: -9.5 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.25, ease }}
      />
    </div>
  );
}

function DesktopDropdown({
  label,
  menuKey,
  isOpen,
  onOpen,
  onClose,
}: {
  label: string;
  menuKey: keyof typeof menus;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}): ReactNode {
  return (
    <div className="relative" onMouseEnter={onOpen} onMouseLeave={onClose}>
      <button
        className="text-foreground/80 hover:text-foreground hover:bg-foreground/5 flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors max-[1200px]:px-3"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {label}
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease }}
            className="absolute top-full left-0 w-72 pt-2"
          >
            <div className="bg-frame border-border overflow-hidden rounded-2xl border p-2 shadow-lg">
              {menus[menuKey].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="hover:bg-muted block rounded-xl px-4 py-3 transition-colors"
                >
                  <div className="text-foreground text-sm font-medium">
                    {item.label}
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    {item.description}
                  </div>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileExpandable({
  label,
  menuKey,
  isExpanded,
  onToggle,
  onClose,
}: {
  label: string;
  menuKey: keyof typeof menus;
  isExpanded: boolean;
  onToggle: () => void;
  onClose: () => void;
}): ReactNode {
  return (
    <div className="border-foreground/10 border-b">
      <button
        className="text-foreground flex w-full items-center justify-between py-4 text-base font-medium"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        {label}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown
            className="text-muted-foreground h-5 w-5"
            aria-hidden="true"
          />
        </motion.div>
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-1 pb-2">
              {menus[menuKey].map((item) => (
                <a
                  key={item.label}
                  href="/passport"
                  className="text-foreground/80 hover:text-foreground block py-2 text-sm"
                  onClick={onClose}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const CornerSVG = ({ className }: { className: string }) => (
  <svg
    className={className}
    width="50"
    height="50"
    viewBox="0 0 50 50"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M5.50871e-06 0C-0.00788227 37.3001 8.99616 50.0116 50 50H5.50871e-06V0Z"
      fill="currentColor"
    />
  </svg>
);

export function Header(): ReactNode {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  const closeMobile = () => setMobileMenuOpen(false);
  const toggleExpanded = (key: string) =>
    setMobileExpanded(mobileExpanded === key ? null : key);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="bg-frame fixed top-2.5 left-1/2 z-9998 w-full max-w-5xl -translate-x-1/2 rounded-b-4xl shadow-2xl/20 max-[1200px]:max-w-2xl max-[850px]:top-0 max-[850px]:right-0 max-[850px]:left-0 max-[850px]:w-full max-[850px]:max-w-none max-[850px]:translate-x-0 max-[850px]:overflow-hidden max-[850px]:rounded-none max-[850px]:rounded-b-4xl"
    >
      <div className="flex h-20 items-center justify-between px-4 max-[850px]:h-18 max-[850px]:px-6">
        <a href="/" className="ml-4 flex items-center gap-2 max-[850px]:ml-0">
          <div className="bg-foreground h-6 w-6 rounded-full" />
          <span className="text-foreground text-lg leading-0 font-semibold max-[1200px]:hidden max-[850px]:inline">
            Vouch
          </span>
        </a>

        <nav className="flex items-center gap-1 max-[1200px]:gap-0 max-[850px]:hidden">
          <DesktopDropdown
            label="Products"
            menuKey="products"
            isOpen={activeMenu === "products"}
            onOpen={() => setActiveMenu("products")}
            onClose={() => setActiveMenu(null)}
          />
          <DesktopDropdown
            label="Resources"
            menuKey="resources"
            isOpen={activeMenu === "resources"}
            onOpen={() => setActiveMenu("resources")}
            onClose={() => setActiveMenu(null)}
          />
          <a
            href="#pricing"
            className="text-foreground/80 hover:text-foreground hover:bg-foreground/5 rounded-full px-4 py-2 text-sm font-medium transition-colors max-[1200px]:px-3"
          >
            Pricing
          </a>
        </nav>

        <div className="flex items-center gap-4 max-[850px]:hidden">
          <a
            href="/developers"
            className="text-foreground/80 hover:text-foreground text-sm font-medium transition-colors"
          >
            Sign in
          </a>
          <a
            href="/passport"
            className="group relative inline-flex items-center"
          >
            <span className="bg-accent absolute inset-y-0 right-0 w-[calc(100%-1.5rem)] rounded-xl" />
            <span className="bg-foreground text-background relative z-10 rounded-xl px-5 py-3 text-sm font-medium">
              Try for free
            </span>
            <span className="relative -left-px z-10 flex h-10 w-10 items-center justify-center rounded-xl text-black">
              <ArrowDownRight className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-45" />
            </span>
          </a>
        </div>

        <button
          className="hidden h-10 w-10 items-center justify-center max-[850px]:flex"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          <HamburgerIcon isOpen={mobileMenuOpen} />
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className="hidden overflow-hidden max-[850px]:block"
          >
            <div className="px-6 pb-4">
              <nav className="space-y-0">
                <a
                  href="/apps"
                  className="text-foreground border-foreground/10 flex items-center justify-between border-b py-4 text-base font-medium"
                  onClick={closeMobile}
                >
                  Consumers
                </a>
                <MobileExpandable
                  label="Products"
                  menuKey="products"
                  isExpanded={mobileExpanded === "products"}
                  onToggle={() => toggleExpanded("products")}
                  onClose={closeMobile}
                />
                <MobileExpandable
                  label="Resources"
                  menuKey="resources"
                  isExpanded={mobileExpanded === "resources"}
                  onToggle={() => toggleExpanded("resources")}
                  onClose={closeMobile}
                />
                <a
                  href="#pricing"
                  className="text-foreground flex items-center justify-between py-4 text-base font-medium"
                  onClick={closeMobile}
                >
                  Pricing
                </a>
              </nav>

              <div className="flex items-center justify-between pt-8 pb-2">
                <a
                  href="/developers"
                  className="text-foreground text-base font-medium"
                  onClick={closeMobile}
                >
                  Sign in
                </a>
                <a
                  href="/passport"
                  className="group relative inline-flex items-center"
                  onClick={closeMobile}
                >
                  <span className="bg-accent absolute inset-y-0 right-0 w-[calc(100%-1.5rem)] rounded-2xl" />
                  <span className="bg-foreground text-background relative z-10 rounded-2xl px-5 py-3 text-sm font-medium">
                    Try for free
                  </span>
                  <span className="text-foreground relative -left-px z-10 flex h-10 w-10 items-center justify-center rounded-2xl">
                    <ArrowDownRight className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-45" />
                  </span>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CornerSVG className="text-frame pointer-events-none absolute top-0 -left-12.25 rotate-180 max-[850px]:hidden" />
      <CornerSVG className="text-frame pointer-events-none absolute top-0 -right-12.25 rotate-90 max-[850px]:hidden" />
    </motion.header>
  );
}
