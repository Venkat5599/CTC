"use client";

import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

const REPO = "https://github.com/Venkat5599/CTC";
const REGISTRY = "0xc5c70bc6cb61ad5c2370c69c8410d3d988e82d46";

/**
 * Every destination here resolves to something a reader can inspect.
 *
 * The template shipped eight links pointing at `#` -- Customers, Careers, Help,
 * Terms, a Twitter that does not exist -- which is worse than an empty footer:
 * it invites a click the page cannot answer, and the first one a judge tries
 * tells them the rest of the site is decoration too. A protocol arguing that
 * unverifiable claims are worthless does not get to ship dead links.
 *
 * So the columns are now the three things somebody evaluating this actually
 * wants: read the code, read the argument, watch it run on chain.
 */
const footerLinks = {
  build: [
    { label: "Source", href: REPO },
    { label: "Contracts", href: `${REPO}/tree/master/packages/contracts/src` },
    { label: "Integrate", href: `${REPO}#-integration` },
  ],
  argument: [
    {
      label: "Threat model",
      href: `${REPO}/blob/master/docs/security/threat-model.md`,
    },
    { label: "Architecture", href: `${REPO}/blob/master/docs/ARCHITECTURE.md` },
    { label: "The forgery", href: `${REPO}/tree/master/scripts/attack` },
  ],
  onChain: [
    {
      label: "Registry on CC3",
      href: `https://creditcoin-testnet.blockscout.com/address/${REGISTRY}`,
    },
    { label: "Attestcoin Protocol", href: "https://docs.attestcoin.org" },
  ],
};

export function Footer(): ReactNode {
  return (
    <footer className="relative mx-2.5 mt-24 pt-38 max-[850px]:mx-0">
      <div className="absolute top-0 left-1/2 w-full max-w-5xl -translate-x-1/2">
        <div className="relative w-full overflow-hidden rounded-3xl shadow-2xl/15">
          <div
            className="absolute inset-0 scale-125 bg-center bg-no-repeat blur brightness-150"
            style={{ backgroundImage: "url(/BG.jpg)", backgroundSize: "150%" }}
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col items-center px-12 py-24 text-center max-[850px]:px-6 max-[850px]:py-6 max-[850px]:pt-12">
            <h2 className="mb-14 max-w-2xl text-6xl font-medium tracking-tight text-black max-[850px]:mb-8 max-[850px]:text-3xl">
              One read. Every lender.
            </h2>

            {/*
              This was a "Join Waitlist" email field that submitted nowhere --
              a dead control dressed as a live one, on a page whose argument is
              that you should not have to take anybody's word. There is no list
              to join, so it is gone. What replaces it is the integration
              itself: the single call a lending contract makes, which is short
              enough to be the call to action rather than describe one.
            */}
            <pre className="w-full max-w-xl overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 text-left text-sm leading-relaxed shadow-lg max-[850px]:text-xs">
              <code className="text-neutral-100">
                <span className="text-neutral-500">if</span> (
                <span className="text-accent">IVouchRegistry</span>(VOUCH).
                <span className="text-accent">hasProof</span>(user, factType)){" "}
                {"{"}
                {"\n"} collateralBps ={" "}
                <span className="text-accent">11_500</span>;
                <span className="text-neutral-500"> // 115%, not 150%</span>
                {"\n"}
                {"}"}
              </code>
            </pre>

            <a
              href={REPO}
              className="bg-foreground text-background hover:bg-foreground/90 mt-8 inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors max-[850px]:w-full max-[850px]:py-3"
            >
              Read the source
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      <div className="bg-accent rounded-tl-[3rem] rounded-tr-[3rem] pt-96 pb-16 max-[850px]:pt-72">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex items-start justify-between gap-12 max-[850px]:flex-col max-[850px]:gap-10">
            <a
              href="/"
              className="flex items-center gap-2"
              aria-label="Vouch home"
            >
              <div className="h-8 w-8 rounded-full bg-neutral-900" />
              <span className="text-xl leading-0 font-semibold text-neutral-900">
                Vouch
              </span>
            </a>

            <nav
              className="flex gap-16 max-[850px]:flex-wrap max-[850px]:gap-10"
              aria-label="Footer navigation"
            >
              {(
                [
                  ["Build", footerLinks.build],
                  ["The argument", footerLinks.argument],
                  ["On chain", footerLinks.onChain],
                ] as const
              ).map(([heading, links]) => (
                <div key={heading}>
                  <h3 className="mb-4 text-xs font-medium tracking-wider text-neutral-900/50 uppercase">
                    {heading}
                  </h3>
                  <ul className="space-y-2">
                    {links.map((link) => (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-neutral-900 transition-colors hover:text-neutral-900/70"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          <div className="mt-16 pt-6">
            <p className="text-center text-sm text-neutral-900/50">
              © {new Date().getFullYear()} Vouch. Built for BUIDL CTC 2026.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
