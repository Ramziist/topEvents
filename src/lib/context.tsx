'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from './api';
import type { Event } from './types';

const CURRENT_EVENT_KEY = 'current_event_id';

interface DashboardContextValue {
  events: Event[];
  activeEventId: string | null;
  activeEvent: Event | null;
  setActiveEventId: (id: string) => void;
  refreshEvents: () => Promise<Event[]>;
  loading: boolean;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshEvents = useCallback(async (): Promise<Event[]> => {
    const { data } = await api.get('/events');
    const list: Event[] = Array.isArray(data?.data) ? data.data : [];
    setEvents(list);

    let stored: string | null = null;
    if (typeof window !== 'undefined') {
      stored = window.localStorage.getItem(CURRENT_EVENT_KEY);
    }

    setActiveEventId((prev) => {
      if (stored && list.some((e) => e.id === stored)) return stored;
      if (prev && list.some((e) => e.id === prev)) return prev;
      return list[0]?.id ?? null;
    });

    return list;
  }, []);

  useEffect(() => {
    refreshEvents()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [refreshEvents]);

  const selectEvent = useCallback((id: string) => {
    setActiveEventId(id);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CURRENT_EVENT_KEY, id);
    }
  }, []);

  const activeEvent = events.find((e) => e.id === activeEventId) ?? null;

  return (
    <DashboardContext.Provider
      value={{ events, activeEventId, activeEvent, setActiveEventId: selectEvent, refreshEvents, loading }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}

