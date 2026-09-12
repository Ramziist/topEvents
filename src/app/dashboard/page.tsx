'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  CheckCircle2,
  Gauge,
  ScanLine,
  Plus,
  Upload,
  ImagePlus,
  Sparkles,
  CalendarDays,
  MapPin,
  PartyPopper,
} from 'lucide-react';
import api, { apiErrorMessage } from '@/lib/api';
import { useDashboard } from '@/lib/context';
import type { Event, Guest } from '@/lib/types';
import { Card, Spinner, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Toaster';
import { formatDate } from '@/lib/utils';

export default function OverviewPage() {
  const { activeEvent, loading } = useDashboard();
  const toast = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!activeEvent) return;
    setBusy(true);
    Promise.all([
      api.get(`/events/${activeEvent.id}`),
      api.get(`/events/${activeEvent.id}/guests`),
    ])
      .then(([ev, g]) => {
        setEvent(ev.data?.data ?? null);
        setGuests(g.data?.data ?? []);
      })
      .catch((e) => toast.error(apiErrorMessage(e)))
      .finally(() => setBusy(false));
  }, [activeEvent, toast]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="text-brand-600" />
      </div>
    );
  }

  if (!activeEvent) {
    return <EmptyState title="No event assigned" description="Ask your administrator to assign you an event." />;
  }

  const stats = event?.seating_stats;
  const total = guests.length;
  const confirmed = guests.filter((g) => g.rsvp_status === 'confirmed').length;
  const capacity = stats?.total_capacity ?? 0;
  const pctFilled = capacity > 0 ? Math.round((total / capacity) * 100) : 0;
  const checkedIn = stats?.checked_in ?? guests.filter((g) => g.checked_in).length;

  const statCards = [
    { label: 'Total Guests', value: total, icon: Users, tint: 'bg-sky-50 text-sky-600' },
    { label: 'Confirmed RSVPs', value: confirmed, icon: CheckCircle2, tint: 'bg-emerald-50 text-emerald-600' },
    { label: 'Capacity Filled', value: `${pctFilled}%`, icon: Gauge, tint: 'bg-brand-50 text-brand-600' },
    { label: 'Check-ins', value: checkedIn, icon: ScanLine, tint: 'bg-violet-50 text-violet-600' },
  ];

  const quickActions = [
    { label: 'Add Guest', icon: Plus, href: '/dashboard/guests' },
    { label: 'Import Guests', icon: Upload, href: '/dashboard/guests' },
    { label: 'Upload Template', icon: ImagePlus, href: '/dashboard/invitation-studio' },
    { label: 'Generate All Cards', icon: Sparkles, href: '/dashboard/invitation-studio' },
  ];

  const location = event?.venue_name ?? event?.custom_location_name ?? 'Custom location';

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 p-6 text-white">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/20 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-white/60">
              <PartyPopper className="h-4 w-4" />
              <span className="uppercase tracking-wide">{event?.event_type ?? 'event'}</span>
            </div>
            <h2 className="mt-1 text-2xl font-bold">{event?.title ?? activeEvent.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-white/70">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> {formatDate(event?.event_date)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {location}
              </span>
            </div>
          </div>
          {busy && <Spinner className="text-white/70" />}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-5">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.tint}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">Quick actions</h3>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.label}
                href={a.href}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                <Icon className="h-4 w-4" /> {a.label}
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
