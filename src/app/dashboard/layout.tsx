'use client';

import { useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { DashboardProvider } from '@/lib/context';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <AuthGuard>
      <DashboardProvider>
        <div className="min-h-screen bg-slate-50">
          <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
          <div className="md:pl-64">
            <Topbar onMenuClick={() => setMenuOpen(true)} />
            <main className="mx-auto max-w-7xl p-4 md:p-8">{children}</main>
          </div>
        </div>
      </DashboardProvider>
    </AuthGuard>
  );
}
