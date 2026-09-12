'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Save, Sparkles, Download, ImagePlus, Move } from 'lucide-react';
import api, { apiErrorMessage } from '@/lib/api';
import { useDashboard } from '@/lib/context';
import type { Font, InvitationTemplate, NameCoords, QrCoords } from '@/lib/types';
import { Button, Card, Input, Label, Select, Spinner, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Toaster';

export default function InvitationStudioPage() {
  const { activeEvent } = useDashboard();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const fontFileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ type: 'name' | 'qr'; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [naturalW, setNaturalW] = useState(800);
  const [naturalH, setNaturalH] = useState(600);
  const [displayW, setDisplayW] = useState(800);

  const [nameCoords, setNameCoords] = useState<NameCoords>({ x: 200, y: 200, font_size: 36, color_hex: '#7A4E2D', center_x: true, placeholder: 'Guest Name' });
  const [qrCoords, setQrCoords] = useState<QrCoords>({ x: 300, y: 400, size: 150 });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [fonts, setFonts] = useState<Font[]>([]);
  const [fontUploading, setFontUploading] = useState(false);

  useEffect(() => {
    if (!activeEvent) return;
    api
      .get(`/events/${activeEvent.id}`)
      .then(({ data }) => {
        const tpl: InvitationTemplate = data?.data?.invitation_template ?? {};
        if (tpl.template_url) setTemplateUrl(tpl.template_url);
        if (tpl.width) setNaturalW(Number(tpl.width));
        if (tpl.height) setNaturalH(Number(tpl.height));
        if (tpl.name_coords) setNameCoords({ font_size: 24, color_hex: '#000000', center_x: true, ...tpl.name_coords });
        if (tpl.qr_coords) setQrCoords({ ...tpl.qr_coords });
      })
      .catch(() => undefined);
  }, [activeEvent]);

  useEffect(() => {
    api
      .get('/fonts')
      .then(({ data }) => setFonts(data?.data ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    function measure() {
      if (canvasRef.current) setDisplayW(canvasRef.current.clientWidth);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [templateUrl]);

  const scale = naturalW > 0 ? displayW / naturalW : 1;
  const selectedFont = fonts.find((f) => f.filename === nameCoords.font);
  const fontUrl = selectedFont?.url ?? null;

  function onPointerDown(e: React.PointerEvent, type: 'name' | 'qr') {
    const orig = type === 'name' ? { x: nameCoords.x, y: nameCoords.y } : { x: qrCoords.x, y: qrCoords.y };
    dragRef.current = { type, startX: e.clientX, startY: e.clientY, origX: orig.x, origY: orig.y };
    e.preventDefault();
  }

  useEffect(() => {
    function move(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const dx = (e.clientX - d.startX) / scale;
      const dy = (e.clientY - d.startY) / scale;
      const nx = Math.max(0, Math.min(naturalW, Math.round(d.origX + dx)));
      const ny = Math.max(0, Math.min(naturalH, Math.round(d.origY + dy)));
      if (d.type === 'name') setNameCoords((c) => ({ ...c, x: nx, y: ny }));
      else setQrCoords((c) => ({ ...c, x: nx, y: ny }));
    }
    function up() {
      dragRef.current = null;
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [scale, naturalW, naturalH]);

  async function uploadTemplate(file: File) {
    if (!activeEvent) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('template', file);
      const { data } = await api.post(`/events/${activeEvent.id}/upload-template`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const r = data?.data;
      setTemplateUrl(r.url);
      setNaturalW(Number(r.width) || 800);
      setNaturalH(Number(r.height) || 600);
      toast.success('Template uploaded');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function uploadFont(file: File) {
    setFontUploading(true);
    try {
      const fd = new FormData();
      fd.append('font', file);
      const { data } = await api.post('/fonts', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const font = data?.data as Font;
      setFonts((prev) => [...prev.filter((f) => f.filename !== font.filename), font]);
      setNameCoords((c) => ({ ...c, font: font.filename }));
      toast.success('Font uploaded');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setFontUploading(false);
      if (fontFileRef.current) fontFileRef.current.value = '';
    }
  }

  async function saveLayout() {
    if (!activeEvent) return;
    setSaving(true);
    try {
      await api.put(`/events/${activeEvent.id}/template`, {
        name_coords: nameCoords,
        qr_coords: qrCoords,
      });
      toast.success('Layout saved');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function generateAll() {
    if (!activeEvent) return;
    setGenerating(true);
    setZipUrl(null);
    try {
      const { data } = await api.post(`/events/${activeEvent.id}/generate-all-cards`);
      const zip = data?.data?.zip_download_url as string | undefined;
      if (zip) {
        setZipUrl(zip);
        toast.success(`Generated ${data?.data?.total_generated ?? 0} cards`);
      } else {
        toast.info('No cards generated');
      }
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Invitation Studio</h2>
          <p className="text-sm text-slate-500">Design the card layout and generate all invitations.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {zipUrl && (
            <a href={zipUrl} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700">
              <Download className="h-4 w-4" /> Download ZIP
            </a>
          )}
          <Button onClick={generateAll} disabled={generating || !templateUrl}>
            {generating ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {generating ? 'Generating…' : 'Generate All Cards (ZIP)'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="space-y-5 p-5">
          <div>
            <Label>Background template</Label>
            <Button variant="secondary" className="w-full" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />} Upload image
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadTemplate(e.target.files[0])}
            />
            {templateUrl && (
              <p className="mt-2 text-xs text-slate-400">{naturalW} × {naturalH} px</p>
            )}
          </div>

          <div>
            <Label>Font</Label>
            <div className="flex gap-2">
              <Select
                value={nameCoords.font ?? ''}
                onChange={(e) => setNameCoords((c) => ({ ...c, font: e.target.value }))}
              >
                <option value="">Default (Tajawal)</option>
                {fonts.map((f) => (
                  <option key={f.filename} value={f.filename}>{f.name}</option>
                ))}
              </Select>
              <Button
                variant="secondary"
                size="icon"
                title="Upload font (.ttf/.otf)"
                onClick={() => fontFileRef.current?.click()}
                disabled={fontUploading}
              >
                {fontUploading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              </Button>
              <input
                ref={fontFileRef}
                type="file"
                accept=".ttf,.otf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadFont(e.target.files[0])}
              />
            </div>
          </div>

          <div>
            <Label>Name font size</Label>
            <Input
              type="number"
              min={0}
              value={nameCoords.font_size ?? 24}
              onChange={(e) => setNameCoords((c) => ({ ...c, font_size: Number(e.target.value) }))}
            />
          </div>

          <div className="flex items-center gap-3">
            <Label className="mb-0">Name color</Label>
            <input
              type="color"
              value={nameCoords.color_hex}
              onChange={(e) => setNameCoords((c) => ({ ...c, color_hex: e.target.value }))}
              className="h-9 w-12 cursor-pointer rounded border border-slate-200 bg-white"
            />
            <span className="text-xs text-slate-400">{nameCoords.color_hex}</span>
          </div>

          <div>
            <Label>Placeholder text</Label>
            <Input
              value={nameCoords.placeholder ?? ''}
              onChange={(e) => setNameCoords((c) => ({ ...c, placeholder: e.target.value }))}
              placeholder="Guest Name"
            />
          </div>

          <div>
            <Label>QR code size</Label>
            <Input
              type="number"
              min={0}
              value={qrCoords.size}
              onChange={(e) => setQrCoords((c) => ({ ...c, size: Number(e.target.value) }))}
            />
          </div>

          <Button onClick={saveLayout} disabled={saving || !templateUrl} className="w-full">
            {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />} Save Layout
          </Button>

          <p className="flex items-start gap-2 text-xs text-slate-400">
            <Move className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Drag the highlighted boxes on the preview to position them.
          </p>
        </Card>

        <Card className="p-4">
          <div
            ref={canvasRef}
            className="relative mx-auto w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
          >
            {templateUrl ? (
              <>
                {fontUrl && (
                  <style>{`@font-face{font-family:'studio-name';src:url('${fontUrl}');}`}</style>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={templateUrl} alt="Invitation template" className="block w-full select-none" draggable={false} />

                <div
                  onPointerDown={(e) => onPointerDown(e, 'qr')}
                  title="QR Code"
                  className="absolute flex cursor-move items-center justify-center rounded-md border-2 border-sky-500 bg-sky-500/15"
                  style={{
                    left: qrCoords.x * scale,
                    top: qrCoords.y * scale,
                    width: qrCoords.size * scale,
                    height: qrCoords.size * scale,
                  }}
                >
                  <span className="text-[10px] font-semibold uppercase text-sky-700">QR</span>
                </div>

                <div
                  onPointerDown={(e) => onPointerDown(e, 'name')}
                  title="Guest Name"
                  className="absolute cursor-move whitespace-nowrap rounded-md border-2 border-dashed border-brand-500 bg-brand-500/10 px-1"
                  style={{
                    left: nameCoords.x * scale,
                    top: nameCoords.y * scale,
                    fontSize: (nameCoords.font_size ?? 24) * scale,
                    color: nameCoords.color_hex,
                    fontFamily: fontUrl ? "'studio-name', sans-serif" : undefined,
                    transform: nameCoords.center_x ? 'translateX(-50%)' : undefined,
                  }}
                >
                  {nameCoords.placeholder || 'Guest Name'}
                </div>
              </>
            ) : (
              <EmptyState
                icon={<ImagePlus className="h-10 w-10" />}
                title="Upload a template"
                description="Upload a background image to start designing the invitation card."
                action={
                  <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                    <Upload className="h-4 w-4" /> Upload image
                  </Button>
                }
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
