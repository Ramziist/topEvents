export type Role = 'super_admin' | 'event_owner' | 'pr_team' | 'scanner';

export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  assigned_event_id: string | null;
}

export interface InvitationTemplate {
  template_url?: string | null;
  image_url?: string | null;
  name_coords?: NameCoords;
  qr_coords?: QrCoords;
  [key: string]: unknown;
}

export interface NameCoords {
  x: number;
  y: number;
  font_size?: number;
  size?: number;
  color_hex?: string;
  color?: string;
  center_x?: boolean;
  center_y?: boolean;
  font?: string;
  placeholder?: string;
}

export interface Font {
  filename: string;
  name: string;
  source: 'bundled' | 'uploaded';
  url: string | null;
}

export interface QrCoords {
  x: number;
  y: number;
  size: number;
}

export interface SeatingStats {
  tables: number;
  total_capacity: number;
  guests_total: number;
  guests_seated: number;
  checked_in: number;
}

export interface Event {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  venue_id: string | null;
  custom_location_name: string | null;
  custom_location_address: string | null;
  invitation_template: InvitationTemplate | null;
  venue_name?: string | null;
  seating_stats?: SeatingStats;
  guests_total?: number;
  guests_confirmed?: number;
}

export type RsvpStatus = 'pending' | 'confirmed' | 'declined';

export interface Companion {
  id?: string;
  full_name: string;
  table_id: string | null;
  table_name?: string | null;
  seat_number?: string | null;
}

export interface UnassignedGuest {
  id: string;
  full_name: string;
  companions_count: number;
  type: 'guest';
}

export interface UnassignedCompanion {
  id: string;
  full_name: string;
  main_guest_name: string;
  type: 'companion';
}

export interface UnassignedAttendees {
  unassigned_guests: UnassignedGuest[];
  unassigned_companions: UnassignedCompanion[];
}

export interface Guest {
  id: string;
  event_id: string;
  table_id: string | null;
  seat_number?: string | null;
  full_name: string;
  phone_number: string | null;
  companions_allowed: number;
  rsvp_status: RsvpStatus;
  token: string;
  custom_attributes?: Record<string, unknown> | null;
  table_name?: string | null;
  table_category?: string | null;
  checked_in?: boolean;
  checked_in_at?: string | null;
  companions?: Companion[];
}

export interface SeatingArea {
  id: string;
  event_id: string;
  name: string;
  category: string | null;
  capacity: number;
  guest_count?: number;
}

export interface Venue {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  has_capacity_limit?: boolean | number;
  max_guest_capacity?: number | null;
  max_tables_capacity?: number | null;
  cost_per_hour?: number | null;
  notes?: string | null;
}
