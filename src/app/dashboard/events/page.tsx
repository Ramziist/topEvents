'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Users, Plus, PartyPopper, ArrowRight, Building2 } from 'lucide-react';
import api, { apiErrorMessage } from '@/lib/api';
import { useDashboard } from '@/lib/context';
import type { Event, Venue } from '@/lib/types';
import { Button, Card, Input, Label, Modal, Select, Spinner, EmptyState, Textarea } from '@/components/ui';
import { useToast } from '@/components/Toaster';
import { formatDate } from '@/lib/utils';

const EVENT_TYPES = ['wedding', 'corporate', 'birthday', 'conference', 'gala', 'other'];

function toMysqlDate(local: string): string {
  if (!local) return '';
  return local.replace('T', ' ') + (local.includes(':') && local.length === 16 ? ':00' : '');
}

export default function EventsPage() {
  const { events, refreshEvents, setActiveEventId, loading } = useDashboard();
  const toast = useToast();
  const router = useRouter();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    event_type: 'wedding',
    event_date: '',
    useVenue: true,
    venue_id: '',
    custom_location_name: '',
    custom_location_address: '',
  });

  useEffect(() => {
    api
      .get('/venues')
      .then(({ data }) => setVenues(data?.data ?? []))
      .catch(() => undefined);
  }, []);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!form.event_date) {
      toast.error('Please choose an event date');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        event_type: form.event_type,
        event_date: toMysqlDate(form.event_date),
      };
      if (form.useVenue) {
        payload.venue_id = form.venue_id || null;
      } else {
        payload.custom_location_name = form.custom_location_name;
        payload.custom_location_address = form.custom_location_address || null;
      }
      const { data } = await api.post('/events', payload);
      const created = data?.data as Event | undefined;
      toast.success('Event created');
      setOpen(false);
      setForm({ title: '', event_type: 'wedding', event_date: '', useVenue: true, venue_id: '', custom_location_name: '', custom_location_address: '' });
      await refreshEvents();
      if (created?.id) {
        setActiveEventId(created.id);
        router.push('/dashboard');
      }
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function enterEvent(ev: Event) {
    setActiveEventId(ev.id);
    router.push('/dashboard');
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Events</h2>
          <p className="text-sm text-slate-500">Select an event to manage, or create a new one.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> إضافة فعالية جديدة
        </Button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Spinner className="text-brand-600" /></div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={<PartyPopper className="h-10 w-10" />}
          title="No events yet"
          description="Create your first event to start managing guests and seating."
          action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Event</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((ev) => {
            const location = ev.venue_name ?? ev.custom_location_name ?? 'Custom location';
            return (
              <Card key={ev.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <PartyPopper className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-slate-600">
                    {ev.event_type}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-bold text-slate-900">{ev.title}</h3>

                <div className="mt-2 space-y-1.5 text-sm text-slate-500">
                  <p className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" /> {formatDate(ev.event_date)}
                  </p>
                  <p className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> {location}
                  </p>
                  <p className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> {ev.guests_total ?? 0} guests
                  </p>
                </div>

                <Button className="mt-4 w-full" onClick={() => enterEvent(ev)}>
                  إدارة الفعالية <ArrowRight className="h-4 w-4" />
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="إضافة فعالية جديدة"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={createEvent} disabled={saving || !form.title || (!form.useVenue && !form.custom_location_name)}>
              {saving ? <Spinner className="h-4 w-4" /> : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={createEvent} className="space-y-4">
          <div>
            <Label>Event title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ahmad & Sarah Wedding" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Location</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, useVenue: true })}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${form.useVenue ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Existing venue
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, useVenue: false })}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${!form.useVenue ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Custom location
              </button>
            </div>
          </div>

          {form.useVenue ? (
            <div>
              <Label>Venue</Label>
              <Select value={form.venue_id} onChange={(e) => setForm({ ...form, venue_id: e.target.value })}>
                <option value="">Select a venue…</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </Select>
            </div>
          ) : (
            <>
              <div>
                <Label>Location name</Label>
                <Input value={form.custom_location_name} onChange={(e) => setForm({ ...form, custom_location_name: e.target.value })} placeholder="City Hall" />
              </div>
              <div>
                <Label>Address</Label>
                <Textarea value={form.custom_location_address} onChange={(e) => setForm({ ...form, custom_location_address: e.target.value })} rows={2} />
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
