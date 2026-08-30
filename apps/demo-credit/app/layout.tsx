import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Providers } from '@/components/providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Borrow against proven standing',
  description:
    'A lending market that prices collateral from cross-chain history proven once through Attestcoin.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-[100dvh] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
