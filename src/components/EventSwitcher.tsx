'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronsUpDown, Check, Search } from 'lucide-react';
import { useDashboard } from '@/lib/context';
import { cn } from '@/lib/utils';

export default function EventSwitcher() {
  const { events, activeEventId, setActiveEventId, activeEvent } = useDashboard();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filtered = query
    ? events.filter((e) => e.title.toLowerCase().includes(query.toLowerCase()))
    : events;

  if (events.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <span className="max-w-[180px] truncate">{activeEvent?.title ?? 'Select event'}</span>
        <ChevronsUpDown className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="relative border-b border-slate-100 p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events…"
              className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto p-1">
            {filtered.map((ev) => (
              <li key={ev.id}>
                <button
                  onClick={() => {
                    setActiveEventId(ev.id);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-50',
                    ev.id === activeEventId ? 'font-semibold text-brand-700' : 'text-slate-700'
                  )}
                >
                  <span className="truncate">{ev.title}</span>
                  {ev.id === activeEventId && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-slate-400">No events found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
