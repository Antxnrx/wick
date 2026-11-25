import type { Metadata } from 'next';
import './globals.css';
import { NavLinks } from '../components/NavLinks';

const SITE_URL = 'https://web-zeta-two-28.vercel.app';

export const metadata: Metadata = {
  title: { default: 'Wick — CMC Trending Audit', template: '%s · Wick' },
  description: "CMC's gainers and most-visited lists have never shared a coin. 0 signal in 11+ windows. Every top gainer is structurally noise.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: 'Wick — Every CMC gainer is noise',
    description: "CMC runs two independent ranking systems. Cross-referencing them reveals: every price pump in the top gainers has zero volume backing. 0 signal coins across 11+ windows.",
    url: SITE_URL,
    siteName: 'Wick',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wick — Every CMC gainer is noise',
    description: "CMC's two independent ranking systems have never agreed. 0 signal coins. 11+ windows. The disjoint IS the finding.",
    creator: '@whereizanton',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0f1117] text-[#e6edf3]">
        <header className="border-b border-[#21262d] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight">wick</span>
            <span className="text-[#64748b] text-xs">CMC trending audit</span>
          </div>
          <NavLinks />
        </header>
        <main className="px-6 py-8 max-w-6xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
