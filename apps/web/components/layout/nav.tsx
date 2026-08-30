'use client';

/**
 * Navigation.
 *
 * Contained rather than flush to the page edges, and one line at every
 * breakpoint. The active item shifts weight and colour rather than growing an
 * underline or sprouting a dot beneath it -- both of those are decoration
 * standing in for a real state.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';

const LINKS = [
  { href: '/passport', label: 'Passport' },
  { href: '/proofs', label: 'Proofs' },
  { href: '/apps', label: 'Apps' },
  { href: '/developers', label: 'Developers' },
];

export function Nav() {
  const pathname = usePathname();
  const { address, isConnected, isConnecting, canConnect, connect, disconnect } = useWallet();

  return (
    <header className="sticky top-0 z-40 border-b border-[--color-line] bg-[--color-base]/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 w-full max-w-[1180px] items-center gap-8 px-6 md:px-10">
        <Link href="/" className="font-mono text-[15px] tracking-tight text-[--color-ink]">
          vouch
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? 'text-[13px] text-[--color-ink]'
                    : 'text-[13px] text-[--color-ink-faint] transition-colors hover:text-[--color-ink-muted]'
                }
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto">
          {isConnected && address ? (
            <button
              type="button"
              onClick={() => disconnect()}
              className="rounded-[--radius-sm] border border-[--color-line-strong] px-3 py-2 font-mono text-[13px] text-[--color-ink-muted] transition-colors hover:border-[--color-ink-faint] hover:text-[--color-ink]"
            >
              {address.slice(0, 6)}...{address.slice(-4)}
            </button>
          ) : (
            <button
              type="button"
              onClick={connect}
              disabled={!canConnect || isConnecting}
              className="rounded-[--radius-sm] bg-[--color-accent] px-3 py-2 font-mono text-[13px] text-[--color-accent-ink] transition-colors hover:bg-[#5fe0d0] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {/* A wallet may genuinely be absent. Saying so beats opening
                  something that cannot resolve. */}
              {!canConnect ? 'No wallet' : isConnecting ? 'Connecting' : 'Connect'}
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
