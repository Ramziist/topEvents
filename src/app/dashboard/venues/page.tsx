'use client';

import { useEffect, useState } from 'react';
import { Building2, Plus, MapPin, Phone, Users, Grid3x3 } from 'lucide-react';
import api, { apiErrorMessage } from '@/lib/api';
import type { Venue } from '@/lib/types';
import { Button, Card, Input, Label, Modal, Spinner, EmptyState, Textarea } from '@/components/ui';
import { useToast } from '@/components/Toaster';

export default function VenuesPage() {
  const toast = useToast();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    city: '',
    address: '',
    contact_person: '',
    contact_phone: '',
    has_capacity_limit: true,
    max_guest_capacity: '',
    max_tables_capacity: '',
    cost_per_hour: '',
    notes: '',
  });

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/venues');
      setVenues(data?.data ?? []);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createVenue(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/venues', {
        name: form.name,
        city: form.city || null,
        address: form.address || null,
        contact_person: form.contact_person || null,
        contact_phone: form.contact_phone || null,
        has_capacity_limit: form.has_capacity_limit,
        max_guest_capacity: form.max_guest_capacity ? Number(form.max_guest_capacity) : null,
        max_tables_capacity: form.max_tables_capacity ? Number(form.max_tables_capacity) : null,
        cost_per_hour: form.cost_per_hour ? Number(form.cost_per_hour) : null,
        notes: form.notes || null,
      });
      toast.success('Venue added');
      setOpen(false);
      setForm({ name: '', city: '', address: '', contact_person: '', contact_phone: '', has_capacity_limit: true, max_guest_capacity: '', max_tables_capacity: '', cost_per_hour: '', notes: '' });
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Venues</h2>
          <p className="text-sm text-slate-500">Manage the halls and locations available for your events.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> إضافة صالة جديدة
        </Button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Spinner className="text-brand-600" /></div>
      ) : venues.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-10 w-10" />}
          title="No venues yet"
          description="Add your first venue to link events to a physical location."
          action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Venue</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {venues.map((v) => (
            <Card key={v.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {v.has_capacity_limit ? 'Capacity limited' : 'No limit'}
                </span>
              </div>

              <h3 className="mt-3 text-lg font-bold text-slate-900">{v.name}</h3>

              <div className="mt-2 space-y-1.5 text-sm text-slate-500">
                {v.city && (
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {v.city}</p>
                )}
                {v.contact_person && (
                  <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {v.contact_person}</p>
                )}
                <p className="flex items-center gap-2">
                  <Users className="h-4 w-4" /> {v.max_guest_capacity ?? '—'} guests
                </p>
                <p className="flex items-center gap-2">
                  <Grid3x3 className="h-4 w-4" /> {v.max_tables_capacity ?? '—'} tables
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="إضافة صالة جديدة"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={createVenue} disabled={saving || !form.name}>
              {saving ? <Spinner className="h-4 w-4" /> : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={createVenue} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Grand Royal Hall" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>Contact person</Label>
              <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>

          <div>
            <Label>Contact phone</Label>
            <Input dir="ltr" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.has_capacity_limit}
              onChange={(e) => setForm({ ...form, has_capacity_limit: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 accent-brand-600"
            />
            Has capacity limit
          </label>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Max guests</Label>
              <Input type="number" min={0} value={form.max_guest_capacity} onChange={(e) => setForm({ ...form, max_guest_capacity: e.target.value })} />
            </div>
            <div>
              <Label>Max tables</Label>
              <Input type="number" min={0} value={form.max_tables_capacity} onChange={(e) => setForm({ ...form, max_tables_capacity: e.target.value })} />
            </div>
            <div>
              <Label>Cost/hr</Label>
              <Input type="number" min={0} step="0.01" value={form.cost_per_hour} onChange={(e) => setForm({ ...form, cost_per_hour: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
