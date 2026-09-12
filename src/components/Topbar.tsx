'use client';

import { Menu, LogOut } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, getUser } from '@/lib/auth';
import EventSwitcher from './EventSwitcher';

const TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/events': 'Events',
  '/dashboard/guests': 'Guests',
  '/dashboard/tables': 'Tables',
  '/dashboard/invitation-studio': 'Invitation Studio',
  '/dashboard/venues': 'Venues',
};

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();

  const title = TITLES[pathname] ?? 'Dashboard';

  function logout() {
    clearSession();
    router.replace('/login');
  }

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur md:px-8">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden sm:block">
          <EventSwitcher />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
            {(user?.full_name ?? 'U').charAt(0).toUpperCase()}
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight text-slate-800">{user?.full_name}</p>
            <p className="text-[11px] capitalize leading-tight text-slate-400">
              {(user?.role ?? '').replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign out"
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
