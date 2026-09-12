'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Plus, Upload, Users, QrCode, MessageCircle, ChevronLeft, ChevronRight, Pencil, X, Download, Copy, FileDown } from 'lucide-react';
import api, { apiErrorMessage } from '@/lib/api';
import { useDashboard } from '@/lib/context';
import type { Guest, SeatingArea, RsvpStatus, Companion } from '@/lib/types';
import { Button, Input, Label, Modal, Select, Spinner, EmptyState, Badge } from '@/components/ui';
import { useToast } from '@/components/Toaster';
import { cardUrl, invitationMessage, whatsappLink, guestImportTemplate, downloadTextFile } from '@/lib/utils';

const PAGE_SIZE = 10;

const RSVP_META: Record<RsvpStatus, { label: string; className: string }> = {
  confirmed: { label: 'Confirmed', className: 'bg-emerald-50 text-emerald-600' },
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-600' },
  declined: { label: 'Declined', className: 'bg-red-50 text-red-600' },
};

export default function GuestsPage() {
  const { activeEvent } = useDashboard();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tables, setTables] = useState<SeatingArea[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState('');
  const [checkedInFilter, setCheckedInFilter] = useState('');

  const [page, setPage] = useState(1);

  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
    table_id: '',
    companions_allowed: 0,
    rsvp_status: 'pending',
    companions: [] as Companion[],
  });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [cardBusy, setCardBusy] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  async function loadTables() {
    if (!activeEvent) return;
    try {
      const { data } = await api.get(`/events/${activeEvent.id}/tables`);
      setTables(data?.data ?? []);
    } catch {
      /* tables are non-critical */
    }
  }

  async function loadGuests() {
    if (!activeEvent) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (tableFilter) params.set('table_id', tableFilter);
      if (rsvpFilter) params.set('rsvp_status', rsvpFilter);
      if (checkedInFilter === '1') params.set('checked_in', '1');
      if (checkedInFilter === '0') params.set('checked_in', '0');
      const { data } = await api.get(`/events/${activeEvent.id}/guests`, { params });
      setGuests(data?.data ?? []);
      setPage(1);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEvent?.id]);

  useEffect(() => {
    loadGuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEvent?.id, debouncedSearch, tableFilter, rsvpFilter, checkedInFilter]);

  function openAdd() {
    setEditingId(null);
    setForm({ full_name: '', phone_number: '', table_id: '', companions_allowed: 0, rsvp_status: 'pending', companions: [] });
    setAddOpen(true);
  }

  function openEdit(guest: Guest) {
    setEditingId(guest.id);
    setForm({
      full_name: guest.full_name,
      phone_number: guest.phone_number ?? '',
      table_id: guest.table_id ?? '',
      companions_allowed: guest.companions_allowed,
      rsvp_status: guest.rsvp_status,
      companions: (guest.companions ?? []).map((c) => ({
        full_name: c.full_name,
        table_id: c.table_id ?? '',
        table_name: c.table_name,
        seat_number: c.seat_number,
      })),
    });
    setAddOpen(true);
  }

  async function saveGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!activeEvent) return;
    setSaving(true);
    const payload = {
      full_name: form.full_name,
      phone_number: form.phone_number || null,
      table_id: form.table_id || null,
      companions_allowed: Number(form.companions_allowed),
      rsvp_status: form.rsvp_status,
      companions: form.companions
        .filter((c) => c.full_name.trim())
        .map((c) => ({ full_name: c.full_name.trim(), table_id: c.table_id || null, seat_number: c.seat_number ?? null })),
    };
    try {
      if (editingId) {
        await api.put(`/guests/${editingId}`, payload);
        toast.success('Guest updated');
      } else {
        await api.post(`/events/${activeEvent.id}/guests`, payload);
        toast.success('Guest added');
      }
      setAddOpen(false);
      setEditingId(null);
      setForm({ full_name: '', phone_number: '', table_id: '', companions_allowed: 0, rsvp_status: 'pending', companions: [] });
      await loadGuests();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function importFile(file: File) {
    if (!activeEvent) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post(`/events/${activeEvent.id}/guests/import-csv`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const importedGuests = Number(data?.imported_guests ?? 0);
      const importedCompanions = Number(data?.imported_companions ?? 0);
      toast.success(`Imported ${importedGuests} guests · ${importedCompanions} companions`);
      await loadGuests();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Import failed'));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function generateCard(guest: Guest) {
    setCardBusy(guest.id);
    try {
      const { data } = await api.post(`/guests/${guest.id}/generate-card`);
      const url = data?.data?.card_url as string;
      toast.success('Card generated');
      if (url) window.open(url, '_blank');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setCardBusy(null);
    }
  }

  function downloadTemplate() {
    downloadTextFile('top_events_guests_template.csv', guestImportTemplate());
    toast.success('Template downloaded');
  }

  async function exportCsv() {
    if (!activeEvent) return;
    try {
      const { data } = await api.get(`/events/${activeEvent.id}/guests/export-csv`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeEvent.title}_guests.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Export failed'));
    }
  }

  async function copyCardLink(guest: Guest) {
    if (!activeEvent) return;
    const url = cardUrl(activeEvent.id, guest.id);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      toast.success('Card link copied');
    } catch {
      toast.error('Could not copy the card link');
    }
  }

  function openWhatsapp(guest: Guest) {
    if (!activeEvent) return;
    const message = invitationMessage({
      guestName: guest.full_name,
      eventTitle: activeEvent.title,
      cardUrl: cardUrl(activeEvent.id, guest.id),
      tableName: guest.table_name,
      totalSeats: 1 + (guest.companions?.length ?? 0),
    });
    const link = whatsappLink(guest.phone_number, message);
    if (!link) {
      toast.error('Guest has no phone number');
      return;
    }
    window.open(link, '_blank');
  }

  const totalPages = Math.max(1, Math.ceil(guests.length / PAGE_SIZE));
  const pageGuests = guests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Guests</h2>
          <p className="text-sm text-slate-500">{guests.length} guests in this event.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> تحميل قالب الاستيراد
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={importing}>
            {importing ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />} Import CSV
          </Button>
          <Button variant="secondary" onClick={exportCsv}>
            <FileDown className="h-4 w-4" /> تصدير البيانات
          </Button>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add Guest
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Search name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={tableFilter} onChange={(e) => setTableFilter(e.target.value)}>
          <option value="">All tables</option>
          {tables.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
        <Select value={rsvpFilter} onChange={(e) => setRsvpFilter(e.target.value)}>
          <option value="">All RSVP</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="declined">Declined</option>
        </Select>
        <Select value={checkedInFilter} onChange={(e) => setCheckedInFilter(e.target.value)}>
          <option value="">All check-in</option>
          <option value="1">Checked in</option>
          <option value="0">Not checked in</option>
        </Select>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Spinner className="text-brand-600" /></div>
      ) : guests.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No guests found"
          description="Add guests manually or import a CSV/Excel file."
          action={<Button onClick={openAdd}><Plus className="h-4 w-4" /> Add Guest</Button>}
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Table</th>
                    <th className="px-4 py-3 font-semibold">Companions</th>
                    <th className="px-4 py-3 font-semibold">RSVP</th>
                    <th className="px-4 py-3 font-semibold">Check-in</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageGuests.map((g) => {
                    const rsvp = RSVP_META[g.rsvp_status] ?? RSVP_META.pending;
                    return (
                      <tr key={g.id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{g.full_name}</td>
                        <td className="px-4 py-3 text-slate-500" dir="ltr">{g.phone_number ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{g.table_name ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{g.companions_allowed}</td>
                        <td className="px-4 py-3"><Badge className={rsvp.className}>{rsvp.label}</Badge></td>
                        <td className="px-4 py-3">
                          {g.checked_in ? (
                            <Badge className="bg-emerald-50 text-emerald-600">Checked in</Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-500">Not checked</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              title="Edit guest"
                              onClick={() => openEdit(g)}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              title="Generate card"
                              onClick={() => generateCard(g)}
                              disabled={cardBusy === g.id}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50"
                            >
                              {cardBusy === g.id ? <Spinner className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
                            </button>
                            <button
                              title="Send WhatsApp"
                              onClick={() => openWhatsapp(g)}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-600"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                            <button
                              title="Copy image / direct link"
                              onClick={() => copyCardLink(g)}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-sky-50 hover:text-sky-600"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); setEditingId(null); }}
        title={editingId ? 'Edit Guest' : 'Add Guest'}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setAddOpen(false); setEditingId(null); }}>Cancel</Button>
            <Button onClick={saveGuest} disabled={saving || !form.full_name}>
              {saving ? <Spinner className="h-4 w-4" /> : 'Save'}
            </Button>
          </>
        }
      >
        <form onSubmit={saveGuest} className="space-y-4">
          <div>
            <Label>Full name</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Guest name" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input dir="ltr" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="+963 …" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Table</Label>
              <Select value={form.table_id} onChange={(e) => setForm({ ...form, table_id: e.target.value })}>
                <option value="">Unassigned</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Companions</Label>
              <Input type="number" min={0} value={form.companions_allowed} onChange={(e) => setForm({ ...form, companions_allowed: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <Label>RSVP status</Label>
            <Select value={form.rsvp_status} onChange={(e) => setForm({ ...form, rsvp_status: e.target.value })}>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="declined">Declined</option>
            </Select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="mb-0">Companions</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setForm((f) => ({ ...f, companions: [...f.companions, { full_name: '', table_id: '', seat_number: null }] }))}
              >
                <Plus className="h-3.5 w-3.5" /> Add companion
              </Button>
            </div>
            {form.companions.length === 0 && (
              <p className="text-xs text-slate-400">No companions yet — add one to assign them to a table.</p>
            )}
            <div className="space-y-2">
              {form.companions.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={c.full_name}
                    onChange={(e) => setForm((f) => ({ ...f, companions: f.companions.map((x, j) => (j === i ? { ...x, full_name: e.target.value } : x)) }))}
                    placeholder="Companion name"
                    className="flex-1"
                  />
                  <Select
                    value={c.table_id ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, companions: f.companions.map((x, j) => (j === i ? { ...x, table_id: e.target.value } : x)) }))}
                    className="w-40"
                  >
                    <option value="">No table</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setForm((f) => ({ ...f, companions: f.companions.filter((_, j) => j !== i) }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
