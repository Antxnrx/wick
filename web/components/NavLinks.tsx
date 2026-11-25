'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/live',      label: 'live' },
  { href: '/dashboard', label: 'dashboard' },
  { href: '/evidence',  label: 'evidence' },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-6 text-xs">
      {LINKS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className={active ? 'text-[#e6edf3]' : 'text-[#64748b] hover:text-[#e6edf3] transition-colors'}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
