'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Grid3x3, Palette, PartyPopper, X, CalendarDays, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUser } from '@/lib/auth';

const NAV = [
  { href: '/dashboard/events', label: 'Events', icon: CalendarDays, adminOnly: true },
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/guests', label: 'Guests', icon: Users },
  { href: '/dashboard/tables', label: 'Tables', icon: Grid3x3 },
  { href: '/dashboard/invitation-studio', label: 'Invitation Studio', icon: Palette },
  { href: '/dashboard/venues', label: 'Venues', icon: Building2, adminOnly: true },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const isAdmin = getUser()?.role === 'super_admin';
  const nav = NAV.filter((item) => !item.adminOnly || isAdmin);

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
          <PartyPopper className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-white">TOP Events</p>
          <p className="text-[11px] text-white/50">by Ziena Suliman</p>
        </div>
        <button onClick={onClose} className="ml-auto rounded-lg p-1 text-white/60 hover:text-white md:hidden">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-gradient-to-b from-slate-900 to-slate-950 md:block">
        {content}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-gradient-to-b from-slate-900 to-slate-950">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
