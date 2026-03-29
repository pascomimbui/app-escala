'use client';

import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { EventWithRoles } from '@/lib/types';
import { getEventStatus, getRoleDisplay, formatPhone } from '@/lib/utils';
import { useUser } from '@/components/layout/UserContext';
import { useRouter } from 'next/navigation';
import { Clock } from 'lucide-react';

interface WeeklyViewProps {
  currentDate: Date;
  events: EventWithRoles[];
  onServe: (eventRoleId: string) => Promise<void>;
}

export default function WeeklyView({ currentDate, events, onServe }: WeeklyViewProps) {
  const router = useRouter();
  const { user } = useUser();
  const weekStart = startOfWeek(currentDate, { locale: ptBR });
  const weekEnd = endOfWeek(currentDate, { locale: ptBR });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getEventsForDay = (day: Date): EventWithRoles[] => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return events.filter((e) => e.date === dateStr);
  };

  return (
    <div className="space-y-3 animate-fade-in stagger-children">
      {days.map((day) => {
        const dayEvents = getEventsForDay(day);
        if (dayEvents.length === 0) return null;

        return (
          <div key={day.toISOString()}>
            {/* Day header */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-xs font-bold capitalize text-[var(--primary)]">
                {format(day, 'EEEE', { locale: ptBR })}
              </span>
              <span className="text-[10px] text-[var(--muted)]">
                {format(day, "dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>

            {/* Event cards */}
            <div className="space-y-2">
              {dayEvents.map((event) => {
                const status = getEventStatus(event);
                const statusColors = {
                  complete: 'border-l-emerald-500',
                  partial: 'border-l-amber-500',
                  empty: 'border-l-red-500',
                  none: 'border-l-zinc-700',
                };

                return (
                  <div
                    key={event.id}
                    className={`glass rounded-xl border-l-4 ${statusColors[status]} p-4 cursor-pointer hover:bg-[var(--surface-hover)] transition-colors`}
                    onClick={() => router.push(`/evento/${event.id}`)}
                  >
                    {/* Event header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold">{event.title}</h3>
                        <div className="flex items-center gap-1 mt-0.5 text-[var(--muted)]">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs">{event.time}</span>
                        </div>
                      </div>
                      <span className={`status-dot ${status}`} />
                    </div>

                    {/* Roles */}
                    <div className="space-y-2">
                      {event.event_roles.map((role) => {
                        const { emoji, label } = getRoleDisplay(role.role);
                        const assignment = role.assignments?.[0];
                        const assignedUser = assignment?.users;
                        const isCurrentUser = assignedUser && user && assignedUser.id === user.id;

                        return (
                          <div
                            key={role.id}
                            className="flex items-center justify-between bg-[var(--surface)] rounded-lg px-3 py-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm">{emoji}</span>
                              <span className="text-xs text-[var(--muted)]">{label}:</span>
                              {assignedUser ? (
                                <div className="flex flex-col min-w-0">
                                  <span className={`text-xs font-bold truncate ${isCurrentUser ? 'text-[var(--primary)]' : 'text-emerald-400'}`}>
                                    {assignedUser.name}
                                    {isCurrentUser && ' (você)'}
                                  </span>
                                  <span className="text-[9px] text-emerald-500/80 font-medium truncate">
                                    {formatPhone(assignedUser.phone)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-[var(--muted)] italic">vazio</span>
                              )}
                            </div>

                            <div className="flex gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {!assignedUser && user && (
                                <button
                                  onClick={() => onServe(role.id)}
                                  className="px-2.5 py-1 rounded-lg bg-[var(--primary)]/20 text-[var(--primary)] text-[10px] font-semibold hover:bg-[var(--primary)]/30 transition-colors btn-press"
                                >
                                  Servir
                                </button>
                              )}
                              {assignedUser && (
                                <button
                                  onClick={() => router.push(`/evento/${event.id}`)}
                                  className="px-2.5 py-1 rounded-lg bg-[var(--surface-hover)] text-[var(--muted)] text-[10px] font-semibold hover:text-[var(--foreground)] transition-colors btn-press"
                                >
                                  {isCurrentUser ? 'Trocar' : 'Ver'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {days.every((day) => getEventsForDay(day).length === 0) && (
        <div className="text-center py-12 text-[var(--muted)]">
          <p className="text-sm">Nenhum evento nesta semana</p>
        </div>
      )}
    </div>
  );
}
