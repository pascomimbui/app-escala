// ============================================================
// Escala PASCOM — Type Definitions
// ============================================================

export interface User {
  id: string;
  name: string;
  phone: string;
  is_admin: boolean;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  youtube_thumbnail?: string | null;
  created_at: string;
}

export type RoleType = 'camera' | 'mesa';

export interface EventRole {
  id: string;
  event_id: string;
  role: RoleType;
}

export interface Assignment {
  id: string;
  event_role_id: string;
  user_id: string;
  created_at: string;
}

export interface SwapRequest {
  id: string;
  assignment_id: string;
  from_user_id: string;
  to_user_id: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  token: string;
  created_at: string;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  event_id: string;
  message: string;
  sent_at: string;
  status: string;
}

// ============================================================
// Joined / Enriched Types (for frontend views)
// ============================================================

export interface EventWithRoles extends Event {
  event_roles: EventRoleWithAssignment[];
}

export interface EventRoleWithAssignment extends EventRole {
  assignments: AssignmentWithUser[];
}

export interface AssignmentWithUser extends Assignment {
  users: User;
}

// Calendar day status
export type DayStatus = 'complete' | 'partial' | 'empty' | 'none';

export interface CalendarDay {
  date: Date;
  events: EventWithRoles[];
  status: DayStatus;
  isCurrentMonth: boolean;
  isToday: boolean;
}

// JSON Import types
export interface EventImportSimple {
  date: string;
  title: string;
  time: string;
}

export interface EventImportAdvanced {
  default_roles: string[];
  events: EventImportSimple[];
}

export type EventImportPayload = EventImportSimple[] | EventImportAdvanced;
