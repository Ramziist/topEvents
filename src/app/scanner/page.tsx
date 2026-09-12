'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wifi,
  WifiOff,
  Download,
  LogOut,
  Camera,
  Search,
  Minus,
  Plus,
  Check,
  X,
  UserSearch,
  ScanLine,
  Loader2,
} from 'lucide-react';
import api from '@/lib/api';
import { getUser, clearSession } from '@/lib/auth';
import {
  getCachedGuestByToken,
  searchCachedGuests,
  enqueueScan,
  updateCachedGuestCheckedIn,
  getPendingCount,
  type CachedGuest,
} from '@/lib/offlineDb';
import { syncDown, setupOnlineSyncListener } from '@/lib/syncManager';
import CameraScanner from '@/components/scanner/CameraScanner';
import ResultModal, { type ScanResult } from '@/components/scanner/ResultModal';

function extractToken(raw: string): string {
  const text = (raw ?? '').trim();
  if (!text) return '';
  if (text.includes('?t=')) {
    try {
      const u = new URL(text);
      return u.searchParams.get('t')?.trim() ?? '';
    } catch {
      const match = text.match(/[?&]t=([^&#]+)/);
      return match ? decodeURIComponent(match[1]).trim() : '';
    }
  }
  return text;
}

export default function ScannerPage() {
  const router = useRouter();
  const user = getUser();
  const eventId = user?.assigned_event_id ?? null;

  const [online, setOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pending, setPending] = useState(0);
  const [cachedCount, setCachedCount] = useState(0);
  const [preloading, setPreloading] = useState(false);
  const [eventTitle, setEventTitle] = useState('');

  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const [confirmGuest, setConfirmGuest] = useState<CachedGuest | null>(null);
  const [companions, setCompanions] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<CachedGuest[]>([]);
  const [searching, setSearching] = useState(false);

  const hardwareRef = useRef<HTMLInputElement>(null);
  const [hwValue, setHwValue] = useState('');
  const isScanning = useRef(false);
  const cooldownRef = useRef<number | null>(null);

  const refreshPending = useCallback(async () => {
    setPending(await getPendingCount());
  }, []);

  useEffect(() => {
    refreshPending();
  }, [refreshPending]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const cleanup = setupOnlineSyncListener(() => refreshPending());
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      cleanup();
    };
  }, [refreshPending]);

  useEffect(() => {
    if (!eventId) return;
    api
      .get(`/events/${eventId}`)
      .then(({ data }) => setEventTitle(data?.data?.title ?? ''))
      .catch(() => undefined);
  }, [eventId]);

  const refocusHardware = useCallback(() => {
    window.setTimeout(() => hardwareRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    refocusHardware();
  }, [refocusHardware]);

  async function preload() {
    if (!eventId) return;
    setPreloading(true);
    try {
      const count = await syncDown(eventId);
      setCachedCount(count);
    } catch {
      setCachedCount(0);
    } finally {
      setPreloading(false);
    }
  }

  function toCached(g: Record<string, unknown>): CachedGuest {
    return {
      id: String(g.id),
      full_name: String(g.full_name ?? ''),
      token: String(g.token ?? ''),
      table_name: (g.table_name as string | null) ?? null,
      table_id: (g.table_id as string | null) ?? null,
      category: (g.table_category as string | null) ?? null,
      companions_allowed: Number(g.companions_allowed ?? 0),
      is_checked_in: !!g.checked_in,
      companions: Array.isArray(g.companions)
        ? (g.companions as Record<string, unknown>[]).map((c) => ({
            id: String(c.id ?? ''),
            full_name: String(c.full_name ?? ''),
            table_id: (c.table_id as string | null) ?? null,
            table_name: (c.table_name as string | null) ?? null,
            seat_number: (c.seat_number as string | null) ?? null,
          }))
        : [],
    };
  }

  async function resolveByToken(token: string): Promise<CachedGuest | null> {
    if (online) {
      try {
        const { data } = await api.get(`/guests/token/${encodeURIComponent(token)}`);
        return data?.data ? toCached(data.data) : null;
      } catch {
        return null;
      }
    }
    return (await getCachedGuestByToken(token)) ?? null;
  }

  function clearCooldown() {
    if (cooldownRef.current) {
      clearTimeout(cooldownRef.current);
      cooldownRef.current = null;
    }
  }

  function releaseScanLock() {
    clearCooldown();
    isScanning.current = false;
  }

  function startCooldown() {
    clearCooldown();
    cooldownRef.current = window.setTimeout(() => {
      isScanning.current = false;
      cooldownRef.current = null;
    }, 3000);
  }

  function showResult(r: ScanResult) {
    setResult(r);
    startCooldown();
  }

  function presentGuest(guest: CachedGuest) {
    if (guest.is_checked_in) {
      showResult({ type: 'conflict', scanned_at: null, guest_name: guest.full_name });
      return;
    }
    setConfirmGuest(guest);
    setCompanions(0);
  }

  async function handleToken(raw: string) {
    if (isScanning.current) return;
    isScanning.current = true;

    const token = extractToken(raw);
    if (!token) {
      showResult({ type: 'invalid' });
      return;
    }
    const guest = await resolveByToken(token);
    if (!guest) {
      showResult({ type: 'invalid' });
      return;
    }
    presentGuest(guest);
  }

  async function doSearch(q: string) {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      if (online && eventId) {
        const { data } = await api.get(`/events/${eventId}/guests`, { params: { search: q } });
        setSearchResults((data?.data ?? []).map(toCached));
      } else {
        setSearchResults(await searchCachedGuests(q));
      }
    } catch {
      setSearchResults(await searchCachedGuests(q));
    } finally {
      setSearching(false);
    }
  }

  async function confirmCheckIn() {
    if (!confirmGuest) return;
    const guest = confirmGuest;
    const companionsCount = companions;
    setConfirmGuest(null);

    if (online) {
      try {
        const { data } = await api.post('/checkin/scan', {
          token: guest.token,
          companions_arrived: companionsCount,
        });
        showResult({
          type: 'success',
          guest_name: data.guest_name ?? guest.full_name,
          guest_table: data.guest_table ?? { id: guest.table_id, name: guest.table_name },
          companions: Array.isArray(data.companions) ? data.companions : [],
        });
        await updateCachedGuestCheckedIn(guest.id, true).catch(() => undefined);
      } catch (err) {
        const resp = (err as { response?: { status?: number; data?: Record<string, unknown> } }).response;
        if (resp?.status === 409) {
          const body = resp?.data ?? {};
          showResult({
            type: 'conflict',
            scanned_at: (body.scanned_at as string) ?? null,
            guest_name: ((body.guest as Record<string, unknown> | undefined)?.full_name as string) ?? guest.full_name,
          });
        } else {
          showResult({ type: 'invalid' });
        }
      }
    } else {
      await enqueueScan(guest.token, companionsCount);
      await updateCachedGuestCheckedIn(guest.id, true);
      showResult({
        type: 'success',
        guest_name: guest.full_name,
        guest_table: { id: guest.table_id, name: guest.table_name },
        companions: (guest.companions ?? []).map((c) => ({ name: c.full_name, table_name: c.table_name })),
      });
    }

    refreshPending();
  }

  return (
    <div
      className="min-h-screen bg-slate-950 text-white"
      onClick={(e) => {
        const tag = (e.target as HTMLElement).tagName;
        if (!['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'].includes(tag)) refocusHardware();
      }}
    >
      <input
        ref={hardwareRef}
        value={hwValue}
        onChange={(e) => setHwValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleToken(hwValue);
            setHwValue('');
          }
        }}
        autoFocus
        className="sr-only"
        autoComplete="off"
      />

      <header className="border-b border-white/10 bg-slate-900/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-brand-400" />
            <span className="font-bold">{eventTitle || 'Door Check-in'}</span>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                online ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
              }`}
            >
              {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {online ? 'متصل' : 'غير متصل'}
            </span>

            <button
              onClick={preload}
              disabled={preloading || !eventId}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold transition hover:bg-brand-700 disabled:opacity-50"
            >
              {preloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              تنزيل القائمة للعمل أوفلاين
            </button>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              قيد الانتظار: {pending} ضيف
            </span>

            <button
              onClick={() => {
                clearSession();
                router.replace('/login');
              }}
              className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setMode('camera')}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              mode === 'camera' ? 'bg-brand-600 text-white' : 'bg-white/10 text-white/70'
            }`}
          >
            <Camera className="h-4 w-4" /> كاميرا
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              mode === 'manual' ? 'bg-brand-600 text-white' : 'bg-white/10 text-white/70'
            }`}
          >
            <UserSearch className="h-4 w-4" /> بحث يدوي
          </button>
        </div>

        {mode === 'camera' ? (
          <div className="space-y-3">
            <CameraScanner key={facingMode} facingMode={facingMode} onScan={handleToken} />
            <div className="flex justify-center">
              <button
                onClick={() => setFacingMode((f) => (f === 'environment' ? 'user' : 'environment'))}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/20"
              >
                <Camera className="h-4 w-4" />
                {facingMode === 'environment' ? 'الكاميرا الأمامية' : 'الكاميرا الخلفية'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  doSearch(e.target.value);
                }}
                placeholder="ابحث بالاسم أو رقم الهاتف…"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-11 py-3.5 text-lg text-white placeholder:text-white/40 outline-none focus:border-brand-500"
              />
            </div>

            {searching && <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-400" />}

            <div className="space-y-2">
              {searchResults.map((g) => (
                <button
                  key={g.id}
                  onClick={() => presentGuest(g)}
                  className="flex w-full items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-left transition hover:bg-white/20"
                >
                  <div>
                    <p className="text-lg font-semibold" dir="auto">{g.full_name}</p>
                    {g.table_name && <p className="text-sm text-white/60">{g.table_name}</p>}
                  </div>
                  {g.is_checked_in ? (
                    <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-300">دخل مسبقاً</span>
                  ) : (
                    <Check className="h-5 w-5 text-white/40" />
                  )}
                </button>
              ))}
              {!searching && searchResults.length === 0 && search.trim() && (
                <p className="py-6 text-center text-white/50">لا توجد نتائج</p>
              )}
            </div>
          </div>
        )}
      </main>

      {confirmGuest && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 p-6 shadow-2xl ring-1 ring-white/10">
            <button
              onClick={() => {
                setConfirmGuest(null);
                releaseScanLock();
              }}
              className="absolute right-4 top-4 rounded-lg p-2 text-white/50 transition hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-center text-3xl font-bold" dir="auto">{confirmGuest.full_name}</h2>
            {(confirmGuest.table_name || confirmGuest.category) && (
              <p className="mt-2 text-center text-xl text-white/80" dir="auto">
                {confirmGuest.table_name}
                {confirmGuest.category ? ` · ${confirmGuest.category}` : ''}
              </p>
            )}

            <div className="mt-6 flex items-center justify-center gap-6">
              <button
                onClick={() => setCompanions((c) => Math.max(0, c - 1))}
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl transition hover:bg-white/20"
              >
                <Minus className="h-6 w-6" />
              </button>
              <div className="text-center">
                <p className="text-4xl font-bold">{companions}</p>
                <p className="text-xs text-white/50">المرافقون</p>
              </div>
              <button
                onClick={() => setCompanions((c) => Math.min(confirmGuest.companions_allowed, c + 1))}
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl transition hover:bg-white/20"
              >
                <Plus className="h-6 w-6" />
              </button>
            </div>

            <button
              onClick={confirmCheckIn}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-xl font-bold transition hover:bg-emerald-700"
            >
              <Check className="h-6 w-6" /> تأكيد الدخول
            </button>
          </div>
        </div>
      )}

      <ResultModal
        result={result}
        onClose={() => {
          setResult(null);
          releaseScanLock();
          refocusHardware();
        }}
      />
    </div>
  );
}
