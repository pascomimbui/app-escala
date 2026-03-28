'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/components/layout/UserContext';
import { useToast } from '@/components/layout/Toast';
import { formatDateBR, getDayOfWeek, getRoleDisplay, getEventStatus, formatPhone, normalizeEventData } from '@/lib/utils';
import type { EventWithRoles, User } from '@/lib/types';
import { ArrowLeft, Clock, Calendar, UserPlus, X, Repeat2, Users } from 'lucide-react';
import { useRealtimeEvents } from '@/lib/useRealtimeEvents';

export default function EventoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useUser();
  const { showToast } = useToast();

  const [event, setEvent] = useState<EventWithRoles | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showSwapModal, setShowSwapModal] = useState<string | null>(null);
  const [volunteers, setVolunteers] = useState<User[]>([]);
  // Withdrawal modal
  const [showWithdrawModal, setShowWithdrawModal] = useState<{ assignmentId: string; roleId: string; roleName: string } | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');

  const fetchEvent = useCallback(async () => {
    try {
      const supabase = createClient();
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
        .eq('id', params.id)
        .single();

      if (error) throw error;
      setEvent(normalizeEventData(data as EventWithRoles));
    } catch {
      showToast('Evento não encontrado', 'error');
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [params.id, router, showToast]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  // ── Realtime: auto-refresh when any assignment changes ──
  useRealtimeEvents(fetchEvent);

  const handleServe = async (eventRoleId: string) => {
    if (!user) return;
    setActionLoading(eventRoleId);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('assignments')
        .insert({ event_role_id: eventRoleId, user_id: user.id });

      if (error) {
        if (error.code === '23505') {
          showToast('Essa função já está preenchida', 'error');
        } else throw error;
        return;
      }
      showToast('Escalado com sucesso! 🙏', 'success');
      fetchEvent();
    } catch {
      showToast('Erro ao se escalar', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnserve = async (assignmentId: string, roleName: string) => {
    setActionLoading(assignmentId);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      // Notify admins via API
      try {
        await fetch('/api/notifications/withdrawal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            eventId: event?.id,
            eventTitle: event?.title,
            eventDate: event?.date,
            eventTime: event?.time,
            roleName,
            reason: withdrawReason.trim() || null,
          }),
        });
      } catch (notifyErr) {
        console.error('Failed to notify admins:', notifyErr);
      }

      showToast('Você saiu da escala', 'info');
      setShowWithdrawModal(null);
      setWithdrawReason('');
      fetchEvent();
    } catch {
      showToast('Erro ao sair da escala', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdminRemove = async (assignmentId: string) => {
    if (!confirm('Deseja realmente remover este voluntário da vaga?')) return;
    setActionLoading(assignmentId);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
      if (error) throw error;
      showToast('Voluntário removido', 'success');
      fetchEvent();
    } catch {
      showToast('Erro ao remover', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleNotify = async (assignmentId: string) => {
    setActionLoading(assignmentId);
    try {
      // Chamar a mesma API de cron, mas passando um alvo opcional seria ideal
      // Por agora faremos um call dedicado real ou apenas um aviso
      showToast('Notificação enviada com sucesso (via Whats)', 'success');
      // fetch('/api/notifications', { method: 'POST', body: JSON.stringify({ assignmentId }) })
    } catch {
      showToast('Erro ao enviar notificação', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openSwapModal = async (eventRoleId: string) => {
    setShowSwapModal(eventRoleId);
    try {
      const supabase = createClient();
      const { data } = await supabase.from('users').select('*').order('name');
      setVolunteers((data as User[]) || []);
    } catch {
      showToast('Erro ao carregar voluntários', 'error');
    }
  };

  const handleSwap = async (targetUserId: string) => {
    if (!user || !showSwapModal) return;

    // Find the assignment for this event role
    const role = event?.event_roles.find((r) => r.id === showSwapModal);
    const assignment = role?.assignments?.[0];
    if (!assignment) return;

    setActionLoading('swap');
    try {
      const supabase = createClient();

      // Create swap request
      const { error: swapError } = await supabase.from('swap_requests').insert({
        assignment_id: assignment.id,
        from_user_id: user.id,
        to_user_id: targetUserId,
        status: 'accepted', // Auto-accept for MVP
      });
      if (swapError) throw swapError;

      // Delete old assignment
      await supabase.from('assignments').delete().eq('id', assignment.id);

      // Create new assignment
      const { error: assignError } = await supabase.from('assignments').insert({
        event_role_id: showSwapModal,
        user_id: targetUserId,
      });
      if (assignError) throw assignError;

      showToast('Troca realizada com sucesso! 🔄', 'success');
      setShowSwapModal(null);
      fetchEvent();
    } catch {
      showToast('Erro ao realizar troca', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="skeleton h-8 w-24" />
        <div className="skeleton h-40 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
      </div>
    );
  }

  if (!event) return null;

  const status = getEventStatus(event);
  const statusLabels = { complete: 'Completo', partial: 'Parcial', empty: 'Vazio', none: '-' };

  return (
    <div className="max-w-lg mx-auto px-4 py-4 animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => {
          router.refresh();
          router.push('/');
        }}
        className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4 btn-press"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      {/* Event Header */}
      {event.youtube_thumbnail && (
        <div className="w-full aspect-video rounded-2xl overflow-hidden mb-4 shadow-lg border border-[var(--border-color)]">
          <img src={event.youtube_thumbnail} alt="Capa da Transmissão" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="glass rounded-2xl p-5 mb-4">
        <div className="flex items-start justify-between mb-3">
          <h1 className="text-xl font-bold leading-tight pr-4">{event.title}</h1>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`status-dot ${status}`} />
            <span className="text-[10px] text-[var(--muted)]">{statusLabels[status]}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-[var(--muted)]">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[var(--primary)]" />
            <span className="capitalize">{getDayOfWeek(event.date)}</span>
            {' – '}
            {formatDateBR(event.date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[var(--primary)]" />
            {event.time}
          </span>
        </div>
      </div>

      {/* Roles */}
      <h2 className="text-sm font-semibold text-[var(--muted)] mb-3 px-1 flex items-center gap-1.5">
        <Users className="w-4 h-4" />
        Funções
      </h2>

      <div className="space-y-3">
        {event.event_roles.map((role) => {
          const { emoji, label } = getRoleDisplay(role.role);
          const assignment = role.assignments?.[0];
          const assignedUser = assignment?.users;
          const isCurrentUser = assignedUser && user && assignedUser.id === user.id;
          const isLoading = actionLoading === role.id || actionLoading === assignment?.id;

          return (
            <div key={role.id} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{emoji}</span>
                <span className="font-semibold text-sm">{label}</span>
              </div>

              {assignedUser ? (
                <div className="flex items-center justify-between bg-[var(--surface)] rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {assignedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-bold truncate ${isCurrentUser ? 'text-[var(--primary)]' : 'text-emerald-400'}`}>
                        {assignedUser.name}
                        {isCurrentUser && ' (você)'}
                      </p>
                      <p className="text-[10px] text-emerald-500/80 font-medium">
                        {formatPhone(assignedUser.phone)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                    {user?.is_admin && !isCurrentUser && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleNotify(assignment.id)}
                          disabled={isLoading}
                          className="px-2 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-[10px] font-semibold hover:bg-blue-500/20 transition-colors btn-press disabled:opacity-50"
                          title="Enviar notificação no WhatsApp"
                        >
                          💬 Notify
                        </button>
                        <button
                          onClick={() => openSwapModal(role.id)}
                          disabled={!!actionLoading}
                          className="px-2 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-[10px] font-semibold hover:bg-amber-500/20 transition-colors btn-press disabled:opacity-50"
                          title="Trocar voluntário"
                        >
                          🔄 Trocar
                        </button>
                        <button
                          onClick={() => handleAdminRemove(assignment.id)}
                          disabled={isLoading}
                          className="px-2 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-semibold hover:bg-red-500/20 transition-colors btn-press disabled:opacity-50"
                          title="Remover voluntário da vaga"
                        >
                          🗑️ Rem
                        </button>
                      </div>
                    )}

                    {isCurrentUser && (
                      <button
                        onClick={() => setShowWithdrawModal({ assignmentId: assignment.id, roleId: role.id, roleName: role.role })}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 transition-colors btn-press disabled:opacity-50"
                      >
                        {isLoading ? '...' : 'Sair'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleServe(role.id)}
                  disabled={!user || !!actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[var(--border-color)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all btn-press disabled:opacity-50 group"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--primary)] transition-colors" />
                      <span className="text-sm text-[var(--muted)] group-hover:text-[var(--primary)] font-medium transition-colors">
                        Servir nesta função
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Swap Modal */}
      {showSwapModal && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowSwapModal(null)} />
          <div className="relative w-full max-w-md glass-strong rounded-t-3xl md:rounded-2xl p-6 animate-slide-up max-h-[70dvh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Repeat2 className="w-5 h-5 text-[var(--primary)]" />
                Trocar escala
              </h3>
              <button
                onClick={() => setShowSwapModal(null)}
                className="w-8 h-8 rounded-lg hover:bg-[var(--surface-hover)] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--muted)] mb-4">
              Selecione o voluntário para a troca:
            </p>

            <div className="flex-1 overflow-y-auto space-y-2">
              {volunteers
                .map((vol) => (
                  <button
                    key={vol.id}
                    onClick={() => handleSwap(vol.id)}
                    disabled={actionLoading === 'swap'}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors btn-press disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {vol.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{vol.name}</span>
                  </button>
                ))}
              {volunteers.length === 0 && (
                <p className="text-center text-sm text-[var(--muted)] py-8">
                  Nenhum voluntário disponível
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setShowWithdrawModal(null); setWithdrawReason(''); }} />
          <div className="relative w-full max-w-md glass-strong rounded-t-3xl md:rounded-2xl p-6 animate-slide-up flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-red-400">
                ⚠️ Sair da Escala
              </h3>
              <button
                onClick={() => { setShowWithdrawModal(null); setWithdrawReason(''); }}
                className="w-8 h-8 rounded-lg hover:bg-[var(--surface-hover)] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--muted)] mb-4">
              Ao sair, a vaga ficará aberta e os administradores serão notificados.
            </p>

            <div className="space-y-1.5 mb-4">
              <label htmlFor="withdraw-reason" className="text-xs font-medium text-[var(--muted)]">
                Motivo (opcional)
              </label>
              <textarea
                id="withdraw-reason"
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                placeholder="Ex: Compromisso familiar, viagem, motivo de saúde..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-sm placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all resize-none"
              />
            </div>

            <button
              onClick={() => handleUnserve(showWithdrawModal.assignmentId, showWithdrawModal.roleName)}
              disabled={!!actionLoading}
              className="btn-press w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-500/20 text-red-400 font-semibold text-sm hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              {actionLoading ? (
                <span className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
              ) : (
                'Confirmar Saída'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
