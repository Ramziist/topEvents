'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, RefreshCw } from 'lucide-react';

function cameraErrorMessage(err: unknown): string {
  const name = (err as { name?: string } | null)?.name ?? '';
  const message = String((err as { message?: string } | null)?.message ?? err ?? '');
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || /permission|denied|not allowed/i.test(message)) {
    return 'يرجى منح صلاحية الكاميرا للمتصفح لتشغيل الماسح';
  }
  if (name === 'NotFoundError' || /not found|no camera|no devices/i.test(message)) {
    return 'لم يتم العثور على كاميرا على هذا الجهاز';
  }
  return 'تعذر تشغيل الكاميرا. يرجى المحاولة مرة أخرى.';
}

export default function CameraScanner({
  facingMode,
  onScan,
}: {
  facingMode: 'environment' | 'user';
  onScan: (text: string) => void;
}) {
  const elementId = useRef(`qr-reader-${Math.random().toString(36).slice(2)}`);
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const lastRef = useRef<{ text: string; time: number } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    // The container <div> is mounted by the time this effect runs.
    const scanner = new Html5Qrcode(elementId.current);
    scannerInstanceRef.current = scanner;
    setError(null);

    scanner
      .start(
        { facingMode },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          const now = Date.now();
          if (lastRef.current?.text === decodedText && now - lastRef.current.time < 3000) {
            return;
          }
          lastRef.current = { text: decodedText, time: now };
          onScanRef.current(decodedText);
        },
        () => undefined
      )
      .catch((err) => {
        setError(cameraErrorMessage(err));
      });

    return () => {
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current
          .stop()
          .catch(() => undefined)
          .then(() => {
            scannerInstanceRef.current?.clear();
            scannerInstanceRef.current = null;
          });
      }
    };
  }, [facingMode, retryKey]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-black">
      <div id={elementId.current} className="w-full [&_video]:rounded-2xl" />
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/90 p-6 text-center">
          <Camera className="h-10 w-10 text-white/40" />
          <p className="text-white/90" dir="auto">{error}</p>
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <RefreshCw className="h-4 w-4" /> إعادة المحاولة
          </button>
        </div>
      )}
    </div>
  );
}

