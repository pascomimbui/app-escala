import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DayStatus, EventWithRoles, AssignmentWithUser } from './types';

/**
 * Normalize Supabase response: the UNIQUE constraint on assignments.event_role_id
 * causes Supabase to return `assignments` as a single object instead of an array.
 * This function ensures it's always an array for consistent frontend logic.
 */
export function normalizeEventData<T extends EventWithRoles>(event: T): T {
  return {
    ...event,
    event_roles: event.event_roles.map((role) => {
      const raw = role.assignments as unknown;
      let assignments: AssignmentWithUser[];

      if (Array.isArray(raw)) {
        assignments = raw;
      } else if (raw && typeof raw === 'object') {
        // Supabase returned a single object — wrap in array
        assignments = [raw as AssignmentWithUser];
      } else {
        assignments = [];
      }

      return { ...role, assignments };
    }),
  };
}

/**
 * Normalize an array of events
 */
export function normalizeEventsData(events: EventWithRoles[]): EventWithRoles[] {
  return events.map(normalizeEventData);
}

/**
 * Format date with Brazilian Portuguese locale
 */
export function formatDateBR(date: Date | string, fmt: string = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt, { locale: ptBR });
}

/**
 * Format day of week in PT-BR
 */
export function getDayOfWeek(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'EEEE', { locale: ptBR });
}

/**
 * Calculate the status of an event based on role assignments
 */
export function getEventStatus(event: EventWithRoles): DayStatus {
  if (!event.event_roles || event.event_roles.length === 0) return 'empty';

  const totalRoles = event.event_roles.length;
  const filledRoles = event.event_roles.filter(
    (role) => role.assignments && role.assignments.length > 0
  ).length;

  if (filledRoles === 0) return 'empty';
  if (filledRoles === totalRoles) return 'complete';
  return 'partial';
}

/**
 * Get the aggregated status for all events on a given day
 */
export function getDayStatus(events: EventWithRoles[]): DayStatus {
  if (events.length === 0) return 'none';

  const statuses = events.map(getEventStatus);

  if (statuses.every((s) => s === 'complete')) return 'complete';
  if (statuses.every((s) => s === 'empty')) return 'empty';
  return 'partial';
}

/**
 * Format phone number with Brazilian mask: (XX) XXXXX-XXXX
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Remove formatting from phone number (keep only digits)
 */
export function cleanPhone(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Validate Brazilian phone number (must have 11 digits)
 */
export function isValidPhone(phone: string): boolean {
  return cleanPhone(phone).length === 11;
}

/**
 * Get role display name and emoji
 */
export function getRoleDisplay(role: string): { emoji: string; label: string } {
  switch (role) {
    case 'camera':
      return { emoji: '🎥', label: 'Câmera' };
    case 'mesa':
      return { emoji: '🎛️', label: 'Mesa de Transmissão' };
    default:
      return { emoji: '📋', label: role };
  }
}

/**
 * Status colors for Tailwind
 */
export function getStatusColor(status: DayStatus): string {
  switch (status) {
    case 'complete':
      return 'bg-emerald-500';
    case 'partial':
      return 'bg-amber-500';
    case 'empty':
      return 'bg-red-500';
    default:
      return 'bg-zinc-700';
  }
}

export function getStatusBorder(status: DayStatus): string {
  switch (status) {
    case 'complete':
      return 'border-emerald-500/40';
    case 'partial':
      return 'border-amber-500/40';
    case 'empty':
      return 'border-red-500/40';
    default:
      return 'border-zinc-700/40';
  }
}
