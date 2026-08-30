/**
 * Chain strip.
 *
 * The chains Vouch can prove from, shown with their real marks. Real logos or
 * none: a row of invented glyphs to fill space is worse than an honest gap,
 * and a wordmark set in the page font is not a logo.
 *
 * Marks come from Simple Icons over CDN, rendered single-colour so the row
 * reads as one row rather than a pile of brand palettes. Logos only -- no
 * category label printed under each one, because "Ethereum" followed by
 * "layer 1" tells the reader nothing they did not already have.
 *
 * Note what this strip does NOT claim. It is the set of chains the protocol
 * supports, not a customer wall. Vouch has no customers yet and inventing a row
 * of them would be the exact fabrication the whole design exists to remove.
 */

const CHAINS = [
  { slug: 'ethereum', name: 'Ethereum' },
  { slug: 'polygon', name: 'Polygon' },
  { slug: 'arbitrum', name: 'Arbitrum' },
  { slug: 'optimism', name: 'Optimism' },
  { slug: 'base', name: 'Base' },
  { slug: 'avalanche', name: 'Avalanche' },
] as const;

export function ChainStrip({ note }: { note?: string }) {
  return (
    <div className="text-center">
      {note ? (
        <p className="mx-auto max-w-[62ch] text-[15px] leading-relaxed text-[--color-ink-muted]">
          {note}
        </p>
      ) : null}

      <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
        {CHAINS.map((chain) => (
          <li key={chain.slug} className="flex flex-col items-center gap-3">
            {/* Single-colour, sized identically, no tile behind it. An icon in
                a filled rounded square is the component-kit default; the mark
                on the surface is the designed version. */}
            <img
              src={`https://cdn.simpleicons.org/${chain.slug}/6b6b76`}
              alt={chain.name}
              width={28}
              height={28}
              className="h-7 w-7 opacity-80 transition-opacity duration-200 hover:opacity-100"
              loading="lazy"
            />
            <span className="text-[12px] text-[--color-ink-faint]">{chain.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
