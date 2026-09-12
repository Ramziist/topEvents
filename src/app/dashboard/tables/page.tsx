'use client';

import { useEffect, useMemo, useState } from 'react';
import { Users, Plus, Grid3x3, Search, UserRound, GripVertical } from 'lucide-react';
import api, { apiErrorMessage } from '@/lib/api';
import { useDashboard } from '@/lib/context';
import type { SeatingArea, Guest, UnassignedGuest, UnassignedCompanion } from '@/lib/types';
import { Button, Card, Input, Label, Modal, ProgressBar, Spinner, EmptyState, Badge } from '@/components/ui';
import { useToast } from '@/components/Toaster';

type AttendeeItem = {
  id: string;
  full_name: string;
  type: 'guest' | 'companion';
  main_guest_name?: string;
  companions_count?: number;
};

export default function TablesPage() {
  const { activeEvent } = useDashboard();
  const toast = useToast();

  const [tables, setTables] = useState<SeatingArea[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [poolGuests, setPoolGuests] = useState<UnassignedGuest[]>([]);
  const [poolCompanions, setPoolCompanions] = useState<UnassignedCompanion[]>([]);
  const [loading, setLoading] = useState(true);

  const [poolSearch, setPoolSearch] = useState('');
  const [dragged, setDragged] = useState<AttendeeItem | null>(null);
  const [shakingTableId, setShakingTableId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', capacity: 10 });
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!activeEvent) return;
    setLoading(true);
    try {
      const [t, g, u] = await Promise.all([
        api.get(`/events/${activeEvent.id}/tables`),
        api.get(`/events/${activeEvent.id}/guests`),
        api.get(`/events/${activeEvent.id}/unassigned-attendees`),
      ]);
      setTables(t.data?.data ?? []);
      setGuests(g.data?.data ?? []);
      setPoolGuests(u.data?.data?.unassigned_guests ?? []);
      setPoolCompanions(u.data?.data?.unassigned_companions ?? []);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEvent?.id]);

  async function createTable(e: React.FormEvent) {
    e.preventDefault();
    if (!activeEvent) return;
    setSaving(true);
    try {
      await api.post(`/events/${activeEvent.id}/tables`, {
        name: form.name,
        category: form.category || null,
        capacity: Number(form.capacity),
      });
      toast.success('Table created');
      setCreateOpen(false);
      setForm({ name: '', category: '', capacity: 10 });
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const occupantsByTable = useMemo(() => {
    const map: Record<string, AttendeeItem[]> = {};
    for (const g of guests) {
      if (g.table_id) {
        (map[g.table_id] ??= []).push({ id: g.id, full_name: g.full_name, type: 'guest' });
      }
      for (const c of g.companions ?? []) {
        if (c.id && c.table_id) {
          (map[c.table_id] ??= []).push({
            id: c.id,
            full_name: c.full_name,
            type: 'companion',
            main_guest_name: g.full_name,
          });
        }
      }
    }
    return map;
  }, [guests]);

  function onDragStart(e: React.DragEvent, item: AttendeeItem) {
    setDragged(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
  }

  function onDragEnd() {
    setDragged(null);
  }

  function triggerShake(tableId: string) {
    setShakingTableId(tableId);
    window.setTimeout(() => setShakingTableId((cur) => (cur === tableId ? null : cur)), 500);
  }

  async function handleDropOnTable(table: SeatingArea) {
    if (!dragged) return;
    const item = dragged;
    setDragged(null);

    const occupants = occupantsByTable[table.id] ?? [];
    const alreadyHere = occupants.some((o) => o.id === item.id);

    if (!alreadyHere && (table.guest_count ?? 0) >= table.capacity) {
      triggerShake(table.id);
      toast.error(`طاولة "${table.name}" ممتلئة`);
      return;
    }

    try {
      if (item.type === 'guest') {
        await api.put(`/guests/${item.id}`, { table_id: table.id });
      } else {
        await api.put(`/companions/${item.id}/assign-table`, { table_id: table.id });
      }
      toast.success(`تم تعيين ${item.full_name} إلى ${table.name}`);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function handleDropOnPool() {
    if (!dragged) return;
    const item = dragged;
    setDragged(null);

    try {
      if (item.type === 'guest') {
        await api.put(`/guests/${item.id}`, { table_id: null });
      } else {
        await api.put(`/companions/${item.id}/assign-table`, { table_id: null });
      }
      toast.success(`تم نقل ${item.full_name} إلى قائمة الانتظار`);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="text-brand-600" />
      </div>
    );
  }

  const q = poolSearch.trim().toLowerCase();
  const filteredPoolGuests = q ? poolGuests.filter((g) => g.full_name.toLowerCase().includes(q)) : poolGuests;
  const filteredPoolCompanions = q
    ? poolCompanions.filter(
        (c) => c.full_name.toLowerCase().includes(q) || c.main_guest_name.toLowerCase().includes(q)
      )
    : poolCompanions;
  const poolTotal = poolGuests.length + poolCompanions.length;

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Seating Management</h2>
            <p className="text-sm text-slate-500">Drag & drop guests and companions onto tables.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Table
          </Button>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <aside className="w-full shrink-0 lg:w-72">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-20">
              <div className="mb-1 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">قائمة الانتظار</h3>
                <Badge className="bg-brand-50 text-brand-700">{poolTotal}</Badge>
              </div>
              <p className="mb-3 text-xs text-slate-400">Unassigned Pool</p>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={poolSearch} onChange={(e) => setPoolSearch(e.target.value)} placeholder="بحث…" className="pl-9" />
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropOnPool}
                className={`mt-3 min-h-[120px] space-y-2 rounded-xl border border-dashed p-2 transition ${
                  dragged ? 'border-brand-400 bg-brand-50/50' : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                {filteredPoolGuests.length === 0 && filteredPoolCompanions.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-slate-400">
                    لا يوجد ضيوف في الانتظار — اسحب المقعد إلى هنا لإلغاء التعيين.
                  </p>
                ) : (
                  <>
                    {filteredPoolGuests.map((g) => (
                      <AttendeeChip
                        key={`g-${g.id}`}
                        item={{ id: g.id, full_name: g.full_name, type: 'guest', companions_count: g.companions_count }}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                      />
                    ))}
                    {filteredPoolCompanions.map((c) => (
                      <AttendeeChip
                        key={`c-${c.id}`}
                        item={{ id: c.id, full_name: c.full_name, type: 'companion', main_guest_name: c.main_guest_name }}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {tables.length === 0 ? (
              <EmptyState
                icon={<Grid3x3 className="h-10 w-10" />}
                title="No tables yet"
                description="Create your first table to start assigning guests."
                action={
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" /> Create Table
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {tables.map((t) => {
                  const occupants = occupantsByTable[t.id] ?? [];
                  const count = t.guest_count ?? occupants.length;
                  const full = count >= t.capacity;
                  const pct = t.capacity > 0 ? Math.round((count / t.capacity) * 100) : 0;
                  return (
                    <Card
                      key={t.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={() => handleDropOnTable(t)}
                      className={`p-4 transition ${shakingTableId === t.id ? 'animate-shake border-red-300' : ''} ${
                        full ? 'border-red-200' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-900">{t.name}</h3>
                          {t.category && (
                            <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                              {t.category}
                            </span>
                          )}
                        </div>
                        <Badge className={full ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-700'}>
                          {count}/{t.capacity}
                        </Badge>
                      </div>

                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                          <span>{t.capacity - count} مقاعد متبقية</span>
                          <span>{full ? 'ممتلئة' : `${pct}%`}</span>
                        </div>
                        <ProgressBar value={pct} />
                      </div>

                      <div
                        className={`mt-3 min-h-[64px] space-y-1.5 rounded-xl border border-dashed p-2 transition ${
                          dragged ? 'border-brand-300 bg-brand-50/30' : 'border-slate-100'
                        }`}
                      >
                        {occupants.length === 0 ? (
                          <p className="px-2 py-4 text-center text-xs text-slate-300">أسقط الضيوف هنا</p>
                        ) : (
                          occupants.map((o) => (
                            <AttendeeChip key={`${o.type}-${o.id}`} item={o} onDragStart={onDragStart} onDragEnd={onDragEnd} />
                          ))
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Table"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createTable} disabled={saving || !form.name}>
              {saving ? <Spinner className="h-4 w-4" /> : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={createTable} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VIP Groom Family" />
          </div>
          <div>
            <Label>Category (optional)</Label>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="VIP / Friends / Family" />
          </div>
          <div>
            <Label>Capacity</Label>
            <Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
          </div>
        </form>
      </Modal>
    </>
  );
}

function AttendeeChip({
  item,
  onDragStart,
  onDragEnd,
}: {
  item: AttendeeItem;
  onDragStart: (e: React.DragEvent, item: AttendeeItem) => void;
  onDragEnd: () => void;
}) {
  const isGuest = item.type === 'guest';
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      onDragEnd={onDragEnd}
      title={item.main_guest_name ? `مرافق ${item.main_guest_name}` : item.full_name}
      className="flex cursor-grab items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm transition hover:border-brand-300 hover:shadow active:cursor-grabbing"
    >
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-slate-300" />
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          isGuest ? 'bg-brand-50 text-brand-700' : 'bg-violet-50 text-violet-700'
        }`}
      >
        {isGuest ? <UserRound className="h-3 w-3" /> : <Users className="h-3 w-3" />}
        {isGuest ? 'ضيف' : 'مرافق'}
      </span>
      <span className="truncate font-medium text-slate-700">{item.full_name}</span>
      {item.main_guest_name && (
        <span className="ml-auto truncate text-[11px] text-slate-400">مرافق {item.main_guest_name}</span>
      )}
      {item.type === 'guest' && item.companions_count ? (
        <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
          +{item.companions_count}
        </span>
      ) : null}
    </div>
  );
}
