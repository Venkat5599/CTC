/**
 * Footer.
 *
 * Aligned to the same grid as everything above it, with the columns balanced
 * rather than flung to opposite edges. The wordmark sits flush at the bottom
 * with no gap beneath it, sized large enough to be a composition rather than
 * text dropped in to fill space.
 */

import Link from 'next/link';

const COLUMNS = [
  {
    heading: 'Protocol',
    links: [
      { href: '/proofs', label: 'Proofs' },
      { href: '/apps', label: 'Consumers' },
      { href: '/developers', label: 'Integrate' },
    ],
  },
  {
    heading: 'Reading',
    links: [
      { href: 'https://github.com/Venkat5599/CTC/blob/master/docs/architecture/overview.md', label: 'Architecture' },
      { href: 'https://github.com/Venkat5599/CTC/blob/master/docs/security/threat-model.md', label: 'Threat model' },
      { href: 'https://github.com/Venkat5599/CTC/blob/master/docs/benchmarks/results.md', label: 'Benchmarks' },
    ],
  },
  {
    heading: 'Source',
    links: [
      { href: 'https://github.com/Venkat5599/CTC', label: 'Repository' },
      { href: 'https://creditcoin-testnet.blockscout.com', label: 'Explorer' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-32 border-t border-[--color-line]">
      <div className="mx-auto w-full max-w-[1180px] px-6 md:px-10">
        <div className="grid grid-cols-2 gap-10 py-16 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <p className="max-w-[30ch] text-[13px] leading-relaxed text-[--color-ink-faint]">
              Attestcoin proves the fact. Vouch makes the fact reusable.
              Applications decide what the fact is worth.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.heading}>
              <div className="text-[13px] text-[--color-ink-muted]">{column.heading}</div>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-[--color-ink-faint] transition-colors hover:text-[--color-ink]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* The wordmark, flush to the bottom edge and clipped there on purpose.
            Given real top and bottom room so no glyph is shaved. */}
        <div className="overflow-hidden pt-8">
          <div
            className="select-none font-mono leading-[0.82] tracking-[-0.04em] text-[--color-line-strong]"
            style={{ fontSize: 'clamp(4rem, 18vw, 13rem)' }}
            aria-hidden
          >
            vouch
          </div>
        </div>
      </div>
    </footer>
  );
}
