import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fileBaseUrl(): string {
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
  return api.replace(/\/api\/?$/, '');
}

export function cardUrl(eventId: string, guestId: string): string {
  return `${fileBaseUrl()}/uploads/cards/${eventId}/${guestId}.jpg`;
}

export interface InvitationOptions {
  guestName: string;
  eventTitle: string;
  cardUrl: string;
  tableName?: string | null;
  totalSeats: number;
}

export function invitationMessage(opts: InvitationOptions): string {
  const table = opts.tableName?.trim() ? opts.tableName : 'غير محددة بعد';
  return [
    `أهلاً وسهلاً بك ${opts.guestName} الكريم/ة 🌸`,
    '',
    `يسرّنا في TOP Events دعوتكم لحضور ${opts.eventTitle}...`,
    '',
    `بطاقة دعوتكم الخاصة: ${opts.cardUrl}`,
    '',
    `طاولتكم: ${table}`,
    `عدد المقاعد: ${opts.totalSeats}`,
    '',
    'نتشرف بحضوركم ✨',
  ].join('\n');
}

export function guestImportTemplate(): string {
  const header = ['full_name', 'phone_number', 'table_name', 'seat_number', 'companions_count', 'companions_data', 'custom_notes'];
  const rows = [
    ['م. محمد العلي', '+963912345678', 'طاولة 1', 'A-01', '2', 'سامر العلي:طاولة 1:A-02 | وائل العلي:طاولة 4:B-05', 'عائلة العريس'],
    ['د. سارة إبراهيم', '+963987654321', 'طاولة الطبيبات', '', '0', '', 'زميلة عمل'],
  ];
  const csv = [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
  return '\uFEFF' + csv;
}

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8;'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function whatsappLink(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
