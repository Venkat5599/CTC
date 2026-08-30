/**
 * ============================================================================
 * SITE CONFIGURATION
 * ============================================================================
 *
 * All copy for the marketing surfaces lives here.
 *
 * Every number on this page is measured rather than asserted. Gas figures come
 * from `packages/contracts/test/Gas.t.sol`, test counts come from the suites
 * themselves, and the security claims each map to a named test. Nothing here
 * describes a customer, a partner, or a deployment that does not exist -- an
 * invented logo wall on a protocol whose whole argument is "stop taking claims
 * on trust" would undo the argument.
 */

export const siteConfig = {
  // Brand
  name: "Vouch",
  tagline: "Portable On-Chain Standing",
  description:
    "Prove what you have done on any supported chain once. Let every Creditcoin application recognise it.",

  // URLs
  url: "https://vouch-registry.vercel.app",
  twitter: "@vouch",

  // Navigation
  nav: {
    cta: {
      text: "Check an address",
      href: "/passport",
    },
    signIn: {
      text: "Developers",
      href: "/developers",
    },
  },
};

export const heroConfig = {
  badge: "CC3 Testnet",
  headline: {
    line1: "Prove it once.",
    line2: "Every app reads it",
    accent: "free.",
  },
  subheadline:
    "A shared standing registry for Creditcoin. One Attestcoin proof, stored on chain, readable by every application for the cost of a storage read.",
  cta: {
    text: "Check an address",
    href: "/passport",
  },
};

export const blurHeadlineConfig = {
  text: "Attestcoin verification is priced against repetition. A lending market, an exchange and a game asking the same question of the same address pay three times for one answer. Vouch verifies once and stores the fact canonically, so the first consumer pays and every consumer after that reads a storage slot.",
};

export const testimonialsConfig = {
  title: "Three protocol failure modes, each one silent",
  autoplayInterval: 10000,
};

export const howItWorksConfig = {
  title: "How a fact becomes standing",
  description:
    "Discovery finds the event, the scheduler batches it, Attestcoin proves it, and the registry stores it. Everything after that is a view call.",
  cta: {
    text: "Read the integration guide",
    href: "/developers",
  },
};

export const pricingConfig = {
  title: "What it costs to read",
  description:
    "Measured against the contracts, not estimated. The first consumer pays for verification; every consumer after that pays for a storage read.",
  billingNote: "Figures from Gas.t.sol",
};

export const faqConfig = {
  title: "What Vouch can and cannot do",
  description:
    "The limitation is structural, not a disclaimer. It is worth understanding before you integrate.",
  cta: {
    primary: {
      text: "Integration guide",
      href: "/developers",
    },
    secondary: {
      text: "Read the threat model",
      href: "https://github.com/Venkat5599/CTC/blob/master/docs/security/threat-model.md",
    },
  },
};

export const footerConfig = {
  cta: {
    headline: "Read standing in one view call",
    placeholder: "0x...",
    button: "Look up",
  },
  copyright: `© ${new Date().getFullYear()} Vouch. Built for BUIDL CTC 2026.`,
};

/**
 * ============================================================================
 * CONTENT
 * ============================================================================
 */

/** The three guards. Each maps to a test that performs the attack. */
export const securityConfig = [
  {
    id: "S1",
    title: "The precompile proves inclusion, not success",
    body: "A reverted transaction is still in its block and still yields a completely valid proof, logs and all. Skipping the receipt check credits actions that never took effect, and it does so silently.",
    test: "test_S1_revertedTransactionIsRejected",
  },
  {
    id: "S2",
    title: "A valid proof of a lookalike event is still valid",
    body: "An attacker deploys a contract emitting a byte-identical Repay naming themselves. Nothing about the proof is wrong. Only the pinned emitter address separates a real repayment from a self-issued one.",
    test: "test_S2_spoofedEmitterIsRejected",
  },
  {
    id: "S3",
    title: "Proofs are public and replayable",
    body: "Watch the mempool, copy a submitted proof, submit it again. Without a guard, standing is farmable from a single genuine repayment by anyone, at the cost of gas.",
    test: "test_S3_replayIsRejected",
  },
];

/** Three unrelated consumers reading one registry. */
export const consumersConfig = [
  {
    name: "VouchCredit",
    domain: "Lending market",
    reads: "Repayment history",
    grants: "Collateral from 150% down to 100%",
    note: "Floors at 100%. Standing reduces collateral and never removes it, because negative history is unprovable.",
  },
  {
    name: "VouchFeeTier",
    domain: "Exchange",
    reads: "Supply history",
    grants: "Taker fee from 0.30% down to 0.10%",
    note: "Counts events rather than value, so one large deposit cannot buy the deepest tier.",
  },
  {
    name: "VouchAccess",
    domain: "Access gate",
    reads: "Any registered fact",
    grants: "A gate that opens, permanently",
    note: "Configured by constructor argument. A fourth application is a deployment, not a new contract type.",
  },
];

/** Measured figures. */
export const metricsConfig = [
  {
    value: "1,202",
    unit: "gas",
    label: "Cost of a consumer read",
    note: "Flat. The tenth application to ask pays what the first paid.",
  },
  {
    value: "0",
    unit: "",
    label: "Precompile calls per read",
    note: "Measured across 75 consecutive reads of the same fact.",
  },
  {
    value: "142",
    unit: "",
    label: "Tests passing",
    note: "52 Solidity, including one per attack the protocol must survive.",
  },
];

export const faqItems = [
  {
    question: "What can Vouch not prove?",
    answer:
      "Inclusion proofs prove positive facts only. Vouch can prove an address repaid; it can never prove an address was never liquidated, because the absence of an event is not enumerable. So an unproven address is unknown, never clean, and a consumer must never read a low tier as evidence of bad behaviour.",
  },
  {
    question: "Can standing go down?",
    answer:
      "No, and that is structural rather than a promise. The registry is append-only and the passport is a pure function of it, so no sequence of operations can lower a tier. A cached tier can only ever be stale-low.",
  },
  {
    question: "Do I have to trust your relayer?",
    answer:
      "No. Submission is permissionless and the relayer is untrusted by construction. It chooses which proofs get submitted and when, so it can stall or censor, and anyone can run their own if it does. It cannot make the registry believe something false: every field is re-derived on chain from the proven payload.",
  },
  {
    question: "What does integrating actually involve?",
    answer:
      "One view call. There is no Attestcoin Smart Contract to write, no off-chain worker to run, no proof gas to pay, and no registration step. A consumer deployed after a fact was proven reads that fact immediately.",
  },
];

/**
 * ============================================================================
 * FEATURE FLAGS
 * ============================================================================
 */

export const features = {
  smoothScroll: true,
  testimonialAutoplay: true,
  parallaxHero: true,
  blurInHeadline: true,
};

/**
 * ============================================================================
 * THEME
 * ============================================================================
 *
 * Locked to dark. The registry console and the ambient light behind it are
 * designed against a near-black ground, and a light variant would need its own
 * pass rather than an inverted palette.
 */

export const themeConfig = {
  defaultTheme: "dark" as "light" | "dark" | "system",
  enableSystemTheme: false,
};
