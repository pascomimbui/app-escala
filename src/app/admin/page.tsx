'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/components/layout/UserContext';
import { useToast } from '@/components/layout/Toast';
import { getRoleDisplay, formatDateBR } from '@/lib/utils';
import { useRealtimeEvents } from '@/lib/useRealtimeEvents';
import {
  Shield, Calendar, Users, BarChart3, FileJson, Plus, ArrowLeft,
  TrendingUp, Clock, ChevronRight, Eye, Trash2, Radio, CheckCircle, AlertCircle
} from 'lucide-react';

interface Stats {
  totalEvents: number;
  totalUsers: number;
  filledAssignments: number;
  totalRoles: number;
  servedLastMonth: number;
  uniqueServersLastMonth: number;
  upcomingEvents: number;
}

interface RecentEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  filledCount: number;
  totalRoles: number;
}

interface TopVolunteer {
  id: string;
  name: string;
  count: number;
}

export default function AdminPage() {
  const { user, loading: userLoading } = useUser();
  const { showToast } = useToast();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalEvents: 0, totalUsers: 0, filledAssignments: 0,
    totalRoles: 0, servedLastMonth: 0, uniqueServersLastMonth: 0,
    upcomingEvents: 0,
  });
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [topVolunteers, setTopVolunteers] = useState<TopVolunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient();
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const lastMonthStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
      const lastMonthEnd = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');

      // Base stats
      const [eventsRes, usersRes, assignmentsRes, rolesRes, upcomingRes] = await Promise.all([
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('assignments').select('id', { count: 'exact', head: true }),
        supabase.from('event_roles').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }).gte('date', today),
      ]);

      // Last month assignments: fetch events from last month with their assignments
      const { data: lastMonthEvents } = await supabase
        .from('events')
        .select(`
          id,
          event_roles (
            assignments ( user_id )
          )
        `)
        .gte('date', lastMonthStart)
        .lte('date', lastMonthEnd);

      let servedLastMonth = 0;
      const uniqueUserIds = new Set<string>();
      if (lastMonthEvents) {
        for (const evt of lastMonthEvents) {
          for (const role of (evt.event_roles as { assignments: { user_id: string } | { user_id: string }[] }[]) || []) {
            // Normalize: Supabase returns object instead of array due to UNIQUE constraint
            const assigns = Array.isArray(role.assignments)
              ? role.assignments
              : role.assignments ? [role.assignments] : [];
            for (const assign of assigns) {
              servedLastMonth++;
              uniqueUserIds.add(assign.user_id);
            }
          }
        }
      }

      setStats({
        totalEvents: eventsRes.count || 0,
        totalUsers: usersRes.count || 0,
        filledAssignments: assignmentsRes.count || 0,
        totalRoles: rolesRes.count || 0,
        servedLastMonth,
        uniqueServersLastMonth: uniqueUserIds.size,
        upcomingEvents: upcomingRes.count || 0,
      });

      // Upcoming events with fill status
      const { data: upcoming } = await supabase
        .from('events')
        .select(`
          id, title, date, time,
          event_roles (
            id,
            assignments ( id )
          )
        `)
        .gte('date', today)
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(8);

      if (upcoming) {
        setRecentEvents(
          upcoming.map((evt) => {
            const roles = (evt.event_roles as { id: string; assignments: { id: string } | { id: string }[] }[]) || [];
            const totalR = roles.length;
            // Normalize: Supabase returns object instead of array due to UNIQUE constraint
            const filledC = roles.filter((r) => {
              if (Array.isArray(r.assignments)) return r.assignments.length > 0;
              return r.assignments != null;
            }).length;
            return {
              id: evt.id,
              title: evt.title,
              date: evt.date,
              time: evt.time,
              filledCount: filledC,
              totalRoles: totalR,
            };
          })
        );
      }

      // Top volunteers (all time)
      const { data: allAssignments } = await supabase
        .from('assignments')
        .select('user_id, users ( id, name )');

      if (allAssignments) {
        const countMap = new Map<string, { name: string; count: number }>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const a of allAssignments as any[]) {
          const u = a.users as { id: string; name: string } | null;
          if (!u) continue;
          const existing = countMap.get(u.id);
          if (existing) {
            existing.count++;
          } else {
            countMap.set(u.id, { name: u.name, count: 1 });
          }
        }
        const sorted = Array.from(countMap.entries())
          .map(([id, { name, count }]) => ({ id, name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        setTopVolunteers(sorted);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading) {
      if (!user) {
        router.push('/cadastro');
        return;
      }
      if (!user.is_admin) {
        showToast('Acesso restrito a administradores', 'error');
        router.push('/');
        return;
      }
      fetchData();
    }
  }, [user, userLoading, router, showToast, fetchData]);

  // ── Realtime: auto-refresh when any assignment changes ──
  useRealtimeEvents(fetchData);

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;
      showToast('Evento removido', 'success');
      setDeleteConfirm(null);
      fetchData();
    } catch {
      showToast('Erro ao remover evento', 'error');
    }
  };

  if (userLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="skeleton w-12 h-12 rounded-xl" />
          <div className="space-y-2">
            <div className="skeleton h-6 w-32" />
            <div className="skeleton h-3 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!user || !user.is_admin) return null;

  const fillRate = stats.totalRoles > 0
    ? Math.round((stats.filledAssignments / stats.totalRoles) * 100)
    : 0;

  const lastMonthName = format(subMonths(new Date(), 1), 'MMMM', { locale: ptBR });

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 animate-fade-in">
      {/* Header */}
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4 btn-press"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Painel Admin</h1>
          <p className="text-[10px] text-[var(--muted)]">Visão geral do sistema</p>
        </div>
      </div>

      {/* ===== STATS GRID ===== */}
      <div className="grid grid-cols-2 gap-3 mb-6 stagger-children">
        {/* Total Eventos */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-5 h-5 text-[var(--primary)]" />
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-semibold">
              {loading ? '...' : `${stats.upcomingEvents} próx.`}
            </span>
          </div>
          <p className="text-2xl font-bold">{loading ? '-' : stats.totalEvents}</p>
          <p className="text-[10px] text-[var(--muted)]">Total de eventos</p>
        </div>

        {/* Total Voluntários */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">
              ativos
            </span>
          </div>
          <p className="text-2xl font-bold">{loading ? '-' : stats.totalUsers}</p>
          <p className="text-[10px] text-[var(--muted)]">Voluntários cadastrados</p>
        </div>

        {/* Fill Rate */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold">{loading ? '-' : `${fillRate}%`}</p>
          <p className="text-[10px] text-[var(--muted)]">Escalas preenchidas</p>
          {!loading && (
            <div className="mt-2 w-full h-1.5 rounded-full bg-[var(--surface)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${fillRate}%`,
                  background: fillRate >= 80 ? 'var(--success)' : fillRate >= 50 ? 'var(--warning)' : 'var(--danger)',
                }}
              />
            </div>
          )}
        </div>

        {/* Vagas Abertas */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-2xl font-bold">{loading ? '-' : stats.totalRoles - stats.filledAssignments}</p>
          <p className="text-[10px] text-[var(--muted)]">Vagas abertas</p>
        </div>
      </div>

      {/* ===== ÚLTIMO MÊS ===== */}
      <div className="glass rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-[var(--primary)]" />
          <h2 className="text-sm font-semibold">Resumo — <span className="capitalize">{lastMonthName}</span></h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--surface)] rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-[var(--primary)]">{loading ? '-' : stats.servedLastMonth}</p>
            <p className="text-[10px] text-[var(--muted)]">Serviços realizados</p>
          </div>
          <div className="bg-[var(--surface)] rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-emerald-400">{loading ? '-' : stats.uniqueServersLastMonth}</p>
            <p className="text-[10px] text-[var(--muted)]">Voluntários serviram</p>
          </div>
        </div>
      </div>

      {/* ===== RANKING DE VOLUNTÁRIOS ===== */}
      {topVolunteers.length > 0 && (
        <div className="glass rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-semibold">Top Voluntários</h2>
            <span className="text-[9px] text-[var(--muted)] ml-auto">todos os tempos</span>
          </div>
          <div className="space-y-2">
            {topVolunteers.map((vol, i) => {
              const medals = ['🥇', '🥈', '🥉'];
              const bar = topVolunteers[0].count > 0
                ? Math.round((vol.count / topVolunteers[0].count) * 100)
                : 0;
              return (
                <div key={vol.id} className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm">
                    {i < 3 ? medals[i] : `${i + 1}°`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium truncate">{vol.name}</span>
                      <span className="text-[10px] text-[var(--muted)] shrink-0 ml-2">{vol.count}×</span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-[var(--surface)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] transition-all duration-700"
                        style={{ width: `${bar}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== PRÓXIMOS EVENTOS ===== */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-semibold text-[var(--muted)] flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            Próximos Eventos
          </h2>
          <span className="text-[9px] text-[var(--muted)]">{recentEvents.length} evento(s)</span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        ) : recentEvents.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <Calendar className="w-8 h-8 text-[var(--muted)] mx-auto mb-2" />
            <p className="text-sm text-[var(--muted)]">Nenhum evento futuro</p>
            <button
              onClick={() => router.push('/admin/eventos')}
              className="mt-3 text-xs text-[var(--primary)] hover:underline"
            >
              Importar eventos →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentEvents.map((evt) => {
              const isComplete = evt.filledCount === evt.totalRoles && evt.totalRoles > 0;
              const isEmpty = evt.filledCount === 0;

              return (
                <div key={evt.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3 group">
                  {/* Date badge */}
                  <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 text-center ${
                    isComplete ? 'bg-emerald-500/15' : isEmpty ? 'bg-red-500/15' : 'bg-amber-500/15'
                  }`}>
                    <span className="text-[10px] font-bold uppercase leading-none text-[var(--muted)]">
                      {format(new Date(evt.date + 'T12:00:00'), 'MMM', { locale: ptBR })}
                    </span>
                    <span className="text-lg font-bold leading-tight">
                      {format(new Date(evt.date + 'T12:00:00'), 'dd')}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{evt.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[var(--muted)] flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> {evt.time}
                      </span>
                      <span className={`text-[10px] font-semibold flex items-center gap-1 ${
                        isComplete ? 'text-emerald-400' : isEmpty ? 'text-red-400' : 'text-amber-400'
                      }`}>
                        {isComplete ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {isComplete ? 'Completo' : isEmpty ? 'Vazio' : 'Parcial'}
                        {' '}
                        {String(evt.filledCount).padStart(2, '0')}-{String(evt.totalRoles).padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => router.push(`/evento/${evt.id}`)}
                      className="w-8 h-8 rounded-lg hover:bg-[var(--surface-hover)] flex items-center justify-center transition-colors"
                      title="Ver evento"
                    >
                      <Eye className="w-4 h-4 text-[var(--muted)]" />
                    </button>
                    {deleteConfirm === evt.id ? (
                      <button
                        onClick={() => handleDeleteEvent(evt.id)}
                        className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-semibold hover:bg-red-500/30 transition-colors"
                      >
                        Confirmar
                      </button>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(evt.id)}
                        className="w-8 h-8 rounded-lg hover:bg-red-500/10 flex items-center justify-center transition-colors"
                        title="Excluir evento"
                      >
                        <Trash2 className="w-4 h-4 text-[var(--muted)] hover:text-red-400" />
                      </button>
                    )}
                  </div>

                  {/* Chevron (mobile) */}
                  <ChevronRight
                    className="w-4 h-4 text-[var(--muted)] shrink-0 md:hidden cursor-pointer"
                    onClick={() => router.push(`/evento/${evt.id}`)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== AÇÕES RÁPIDAS ===== */}
      <h2 className="text-sm font-semibold text-[var(--muted)] mb-3 px-1">Ações Rápidas</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        <button
          onClick={() => router.push('/admin/eventos')}
          className="btn-press flex items-center gap-2 px-3 py-3 rounded-xl glass hover:bg-[var(--surface-hover)] transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/20 flex items-center justify-center shrink-0">
            <FileJson className="w-4 h-4 text-[var(--primary)]" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-[10px] font-semibold">JSON</p>
          </div>
        </button>

        <button
          onClick={() => router.push('/admin/transmissoes')}
          className="btn-press flex items-center gap-2 px-3 py-3 rounded-xl glass hover:bg-[var(--surface-hover)] transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-[10px] font-semibold">YouTube</p>
          </div>
        </button>

        <button
          onClick={() => router.push('/admin/equipe')}
          className="btn-press flex items-center gap-2 px-3 py-3 rounded-xl glass hover:bg-[var(--surface-hover)] transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-[10px] font-semibold">Equipe</p>
          </div>
        </button>

        <button
          onClick={() => router.push('/admin/whatsapp')}
          className="btn-press flex items-center gap-2 px-3 py-3 rounded-xl glass hover:bg-[var(--surface-hover)] transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-[10px] font-semibold">WhatsApp</p>
          </div>
        </button>
      </div>
    </div>
  );
}
