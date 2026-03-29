'use client';

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { EventWithRoles } from '@/lib/types';
import { getDayStatus } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { X, Clock } from 'lucide-react';

interface MonthlyViewProps {
  currentDate: Date;
  events: EventWithRoles[];
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function MonthlyView({ currentDate, events }: MonthlyViewProps) {
  const router = useRouter();
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ day: Date; events: EventWithRoles[] } | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day: Date): EventWithRoles[] => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return events.filter((e) => e.date === dateStr);
  };

  const handleDayClick = (day: Date) => {
    const dayEvents = getEventsForDay(day);
    if (dayEvents.length === 1) {
      router.push(`/evento/${dayEvents[0].id}`);
    } else if (dayEvents.length > 1) {
      setSelectedDayEvents({ day, events: dayEvents });
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-[var(--muted)] py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const status = getDayStatus(dayEvents);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const today = isToday(day);
          const hasEvents = dayEvents.length > 0;

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              disabled={!hasEvents}
              className={`
                relative aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-xs font-medium
                ${!isCurrentMonth ? 'opacity-25' : ''}
                ${today ? 'ring-1 ring-[var(--primary)]/50' : ''}
                ${hasEvents ? 'cursor-pointer hover:bg-[var(--surface-hover)] active:scale-95' : 'cursor-default'}
                ${hasEvents ? 'bg-[var(--surface)]' : ''}
              `}
            >
              <span className={today ? 'text-[var(--primary)] font-bold' : ''}>
                {format(day, 'd')}
              </span>
              {hasEvents && (
                <div className="flex gap-0.5">
                  {dayEvents.length > 1 ? (
                    <span className="text-[8px] text-[var(--muted)]">{dayEvents.length}×</span>
                  ) : null}
                  <span className={`status-dot ${status}`} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Multi-event Modal */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedDayEvents(null)} />
          <div className="relative w-full max-w-sm glass-strong rounded-t-3xl md:rounded-2xl p-6 animate-slide-up flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                Eventos do dia {format(selectedDayEvents.day, 'dd/MM')}
              </h3>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="w-8 h-8 rounded-lg hover:bg-[var(--surface-hover)] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              {selectedDayEvents.events.map(evt => (
                <div 
                  key={evt.id}
                  onClick={() => router.push(`/evento/${evt.id}`)}
                  className="glass rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--surface-hover)] transition-colors btn-press"
                >
                  <div>
                    <h4 className="font-semibold text-sm">{evt.title}</h4>
                    <p className="text-[10px] text-[var(--muted)] flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {evt.time}
                    </p>
                  </div>
                  <span className={`status-dot ${getDayStatus([evt])}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
