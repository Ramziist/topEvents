'use client';

import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';

export interface SuccessResult {
  type: 'success';
  guest_name: string;
  guest_table: { id: string | null; name: string | null };
  companions: { name: string; table_name: string | null }[];
}
export interface ConflictResult {
  type: 'conflict';
  scanned_at: string | null;
  guest_name?: string;
}
export interface InvalidResult {
  type: 'invalid';
}
export type ScanResult = SuccessResult | ConflictResult | InvalidResult;

function tone(freq: number, duration: number, type: OscillatorType = 'sine') {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0.2;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  } catch {
    /* audio unavailable */
  }
}

export default function ResultModal({ result, onClose }: { result: ScanResult | null; onClose: () => void }) {
  useEffect(() => {
    if (!result) return;

    if (result.type === 'success') {
      tone(880, 0.15);
      window.setTimeout(() => tone(1174, 0.2), 120);
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      const t = window.setTimeout(onClose, 3000);
      return () => window.clearTimeout(t);
    }

    if (result.type === 'conflict') {
      tone(220, 0.4, 'square');
    }
  }, [result, onClose]);

  if (!result) return null;

  const bg =
    result.type === 'success'
      ? 'bg-emerald-600'
      : result.type === 'conflict'
        ? 'bg-red-600'
        : 'bg-orange-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className={`w-full max-w-md rounded-3xl p-8 text-center text-white shadow-2xl ${bg}`}>
        {result.type === 'success' && (
          <>
            <CheckCircle2 className="mx-auto h-16 w-16" />
            <h2 className="mt-4 text-3xl font-bold" dir="auto">{result.guest_name}</h2>
            {result.guest_table?.name && (
              <div className="mx-auto mt-4 inline-block rounded-2xl bg-white/20 px-6 py-3 text-xl font-bold" dir="auto">
                {result.guest_table.name}
              </div>
            )}
            {result.companions.length > 0 && (
              <div className="mx-auto mt-4 max-w-xs space-y-1.5 text-right">
                <p className="text-sm font-semibold text-white/80">المرافقون:</p>
                {result.companions.map((c, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-white/15 px-3 py-2">
                    <span className="font-medium" dir="auto">{c.name}</span>
                    <span className="text-sm text-white/80" dir="auto">{c.table_name ?? '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {result.type === 'conflict' && (
          <>
            <AlertTriangle className="mx-auto h-16 w-16" />
            <h2 className="mt-4 text-2xl font-bold">تنبيه: تم تسجيل دخول هذا الكرت مسبقاً!</h2>
            {result.scanned_at && (
              <p className="mt-3 text-white/90" dir="ltr">
                {new Date(result.scanned_at).toLocaleString()}
              </p>
            )}
          </>
        )}

        {result.type === 'invalid' && (
          <>
            <XCircle className="mx-auto h-16 w-16" />
            <h2 className="mt-4 text-2xl font-bold">رمز غير صالح أو لا ينتمي لهذه الفعالية</h2>
          </>
        )}

        <button
          onClick={onClose}
          className="mx-auto mt-6 flex items-center gap-2 rounded-xl bg-white/20 px-6 py-3 text-lg font-semibold transition hover:bg-white/30"
        >
          الضيف التالي <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
