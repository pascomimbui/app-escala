'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/components/layout/UserContext';
import { useToast } from '@/components/layout/Toast';
import type { EventWithRoles } from '@/lib/types';
import { normalizeEventsData } from '@/lib/utils';
import CalendarToggle from '@/components/calendar/CalendarToggle';
import MonthlyView from '@/components/calendar/MonthlyView';
import WeeklyView from '@/components/calendar/WeeklyView';
import { useRouter } from 'next/navigation';
import { useRealtimeEvents } from '@/lib/useRealtimeEvents';

export default function HomePage() {
  const { user, loading: userLoading } = useUser();
  const { showToast } = useToast();
  const router = useRouter();

  const [view, setView] = useState<'monthly' | 'weekly'>('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EventWithRoles[]>([]);
  const [loading, setLoading] = useState(true);

  // Load saved view preference
  useEffect(() => {
    const saved = localStorage.getItem('escala_calendar_view');
    if (saved === 'weekly' || saved === 'monthly') setView(saved);
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/cadastro');
    }
  }, [user, userLoading, router]);

  const handleViewToggle = (v: 'monthly' | 'weekly') => {
    setView(v);
    localStorage.setItem('escala_calendar_view', v);
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Get first/last day range for the current month (+ buffer)
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(new Date(year, month + 2, 0), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          event_roles (
            *,
            assignments (
              *,
              users (*)
            )
          )
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;
      setEvents(normalizeEventsData((data as EventWithRoles[]) || []));
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    if (user) fetchEvents();
  }, [fetchEvents, user]);

  // ── Realtime: auto-refresh when any assignment changes ──
  useRealtimeEvents(fetchEvents);

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (view === 'monthly') {
      setCurrentDate((d) => (direction === 'next' ? addMonths(d, 1) : subMonths(d, 1)));
    } else {
      setCurrentDate((d) => (direction === 'next' ? addWeeks(d, 1) : subWeeks(d, 1)));
    }
  };

  const handleServe = async (eventRoleId: string) => {
    if (!user) {
      showToast('Faça login primeiro', 'error');
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('assignments')
        .insert({ event_role_id: eventRoleId, user_id: user.id });

      if (error) {
        if (error.code === '23505') {
          showToast('Essa função já está preenchida', 'error');
        } else {
          throw error;
        }
        return;
      }

      showToast('Você se escalou com sucesso! 🙏', 'success');
      fetchEvents();
    } catch (err) {
      console.error(err);
      showToast('Erro ao se escalar', 'error');
    }
  };

  if (userLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-8 w-56" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="skeleton aspect-square" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Controls */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <CalendarToggle view={view} onToggle={handleViewToggle} />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => handleNavigate('prev')}
            className="w-9 h-9 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] flex items-center justify-center transition-colors btn-press"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <h2 className="text-lg font-bold capitalize">
            {view === 'monthly'
              ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
              : `Semana de ${format(currentDate, "dd 'de' MMM", { locale: ptBR })}`
            }
          </h2>

          <button
            onClick={() => handleNavigate('next')}
            className="w-9 h-9 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] flex items-center justify-center transition-colors btn-press"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-[var(--muted)]">
          <span className="flex items-center gap-1"><span className="status-dot complete" /> Completo</span>
          <span className="flex items-center gap-1"><span className="status-dot partial" /> Parcial</span>
          <span className="flex items-center gap-1"><span className="status-dot empty" /> Vazio</span>
        </div>
      </div>

      {/* Calendar View */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      ) : view === 'monthly' ? (
        <MonthlyView currentDate={currentDate} events={events} />
      ) : (
        <WeeklyView currentDate={currentDate} events={events} onServe={handleServe} />
      )}
    </div>
  );
}
