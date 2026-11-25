import type { Metadata } from 'next';
import './globals.css';
import { NavLinks } from '../components/NavLinks';

export const metadata: Metadata = {
  title: 'Wick — CMC Trending Audit',
  description: "CMC's own two trending endpoints disagree. That disagreement predicts outcome.",
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
