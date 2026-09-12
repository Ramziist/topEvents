import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'top-events-db';
const DB_VERSION = 1;

export interface CachedCompanion {
  id: string;
  full_name: string;
  table_id: string | null;
  table_name: string | null;
  seat_number: string | null;
}

export interface CachedGuest {
  id: string;
  full_name: string;
  token: string;
  table_id: string | null;
  table_name: string | null;
  category: string | null;
  companions_allowed: number;
  is_checked_in: boolean;
  companions: CachedCompanion[];
}

export interface SyncItem {
  id?: number;
  token: string;
  companions_arrived: number;
  scanned_at: string;
  synced: boolean;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cached_guests')) {
          const store = db.createObjectStore('cached_guests', { keyPath: 'id' });
          store.createIndex('token', 'token', { unique: true });
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          const store = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
          store.createIndex('synced', 'synced');
        }
      },
    });
  }
  return dbPromise;
}

/** Replace the cached guest list for an event. */
export async function cacheGuests(guests: CachedGuest[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('cached_guests', 'readwrite');
  tx.store.clear();
  for (const g of guests) {
    tx.store.put(g);
  }
  await tx.done;
}

export async function getCachedGuests(): Promise<CachedGuest[]> {
  const db = await getDb();
  return db.getAll('cached_guests');
}

export async function getCachedGuestByToken(token: string): Promise<CachedGuest | undefined> {
  const db = await getDb();
  return db.getFromIndex('cached_guests', 'token', token);
}

export async function updateCachedGuestCheckedIn(id: string, checkedIn: boolean): Promise<void> {
  const db = await getDb();
  const guest = await db.get('cached_guests', id);
  if (guest) {
    await db.put('cached_guests', { ...guest, is_checked_in: checkedIn });
  }
}

export async function searchCachedGuests(query: string): Promise<CachedGuest[]> {
  const all = await getCachedGuests();
  const q = query.trim().toLowerCase();
  if (!q) return all;
  return all.filter(
    (g) => g.full_name.toLowerCase().includes(q) || (g.token ?? '').toLowerCase().includes(q)
  );
}

export async function enqueueScan(token: string, companionsArrived: number): Promise<IDBValidKey> {
  const db = await getDb();
  return db.add('sync_queue', {
    token,
    companions_arrived: companionsArrived,
    scanned_at: new Date().toISOString(),
    synced: false,
  });
}

export async function getPendingScans(): Promise<SyncItem[]> {
  const db = await getDb();
  const all = await db.getAll('sync_queue');
  return all.filter((s) => !s.synced);
}

export async function getPendingCount(): Promise<number> {
  return (await getPendingScans()).length;
}

export async function markScanSynced(id: number): Promise<void> {
  const db = await getDb();
  const item = await db.get('sync_queue', id);
  if (item) {
    await db.put('sync_queue', { ...item, synced: true });
  }
}

export async function clearSyncedScans(): Promise<void> {
  const db = await getDb();
  const all = await db.getAll('sync_queue');
  const tx = db.transaction('sync_queue', 'readwrite');
  for (const item of all) {
    if (item.synced) tx.store.delete(item.id!);
  }
  await tx.done;
}
