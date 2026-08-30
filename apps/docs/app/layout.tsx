import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Vouch docs',
  description: 'Integrate portable on-chain standing in under twenty lines.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-[100dvh] antialiased">{children}</body>
    </html>
  );
}
