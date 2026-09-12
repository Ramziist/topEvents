import api from './api';
import {
  cacheGuests,
  getPendingScans,
  markScanSynced,
  clearSyncedScans,
  type CachedGuest,
} from './offlineDb';

/**
 * Pull the full guest list for an event into IndexedDB for offline use.
 * Returns the number of guests cached.
 */
export async function syncDown(eventId: string): Promise<number> {
  const { data } = await api.get(`/events/${eventId}/guests`);
  const list = Array.isArray(data?.data) ? data.data : [];

  const guests: CachedGuest[] = list.map((g: Record<string, unknown>) => ({
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
  }));

  await cacheGuests(guests);
  return guests.length;
}

/**
 * Push pending offline check-ins to the server (sequentially).
 * Items are marked synced on 200 (success) or 409 (already checked in).
 */
export async function syncUp(): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingScans();
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      await api.post('/checkin/scan', {
        token: item.token,
        companions_arrived: item.companions_arrived,
      });
      if (item.id != null) await markScanSynced(item.id);
      synced++;
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        // Already checked in server-side — resolve the pending item.
        if (item.id != null) await markScanSynced(item.id);
        synced++;
      } else {
        failed++;
      }
    }
  }

  await clearSyncedScans();
  return { synced, failed };
}

/**
 * Register a browser 'online' listener that triggers syncUp automatically.
 * Returns a cleanup function.
 */
export function setupOnlineSyncListener(onSynced: (result: { synced: number; failed: number }) => void): () => void {
  const handler = () => {
    if (navigator.onLine) {
      syncUp().then(onSynced).catch(() => undefined);
    }
  };
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}
