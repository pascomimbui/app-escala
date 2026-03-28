'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/components/layout/UserContext';
import { useToast } from '@/components/layout/Toast';
import { getRoleDisplay, formatDateBR, getDayOfWeek } from '@/lib/utils';
import { Repeat2, Check, X, Radio } from 'lucide-react';

interface SwapData {
  id: string;
  token: string;
  status: string;
  from_user: { name: string };
  assignment: {
    event_role: {
      role: string;
      event: { title: string; date: string; time: string };
    };
  };
}

export default function TrocaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useUser();
  const { showToast } = useToast();
  const [swap, setSwap] = useState<SwapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function fetchSwap() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('swap_requests')
          .select(`
            id, token, status,
            from_user:from_user_id (name),
            assignment:assignment_id (
              event_role:event_role_id (
                role,
                event:event_id (title, date, time)
              )
            )
          `)
          .eq('token', params.id)
          .single();

        if (error) throw error;
        setSwap(data as unknown as SwapData);
      } catch {
        showToast('Troca não encontrada', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchSwap();
  }, [params.id, showToast]);

  const handleAccept = async () => {
    if (!user || !swap) return;
    setProcessing(true);
    try {
      const supabase = createClient();

      // Update swap status
      await supabase
        .from('swap_requests')
        .update({ status: 'accepted', to_user_id: user.id })
        .eq('id', swap.id);

      // Get the assignment
      const { data: swapData } = await supabase
        .from('swap_requests')
        .select('assignment_id')
        .eq('id', swap.id)
        .single();

      if (swapData) {
        // Get event_role_id from assignment
        const { data: assignData } = await supabase
          .from('assignments')
          .select('event_role_id')
          .eq('id', swapData.assignment_id)
          .single();

        if (assignData) {
          // Delete old, create new
          await supabase.from('assignments').delete().eq('id', swapData.assignment_id);
          await supabase.from('assignments').insert({
            event_role_id: assignData.event_role_id,
            user_id: user.id,
          });
        }
      }

      showToast('Troca aceita! Você está escalado. 🙏', 'success');
      router.push('/');
    } catch {
      showToast('Erro ao aceitar troca', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!swap) return;
    setProcessing(true);
    try {
      const supabase = createClient();
      await supabase
        .from('swap_requests')
        .update({ status: 'rejected' })
        .eq('id', swap.id);

      showToast('Troca recusada', 'info');
      router.push('/');
    } catch {
      showToast('Erro ao recusar troca', 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-sm mx-auto px-4 py-12 space-y-4">
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    );
  }

  if (!swap) {
    return (
      <div className="max-w-sm mx-auto px-4 py-12 text-center">
        <p className="text-[var(--muted)]">Troca não encontrada ou expirada.</p>
      </div>
    );
  }

  if (swap.status !== 'pending') {
    return (
      <div className="max-w-sm mx-auto px-4 py-12 text-center">
        <Repeat2 className="w-12 h-12 text-[var(--muted)] mx-auto mb-4" />
        <p className="text-lg font-semibold">Troca já processada</p>
        <p className="text-sm text-[var(--muted)] mt-1">
          Status: {swap.status === 'accepted' ? 'Aceita ✓' : 'Recusada ✗'}
        </p>
      </div>
    );
  }

  const event = swap.assignment.event_role.event;
  const { emoji, label } = getRoleDisplay(swap.assignment.event_role.role);

  return (
    <div className="max-w-sm mx-auto px-4 py-8 animate-fade-in">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center mb-4 animate-pulse-glow">
          <Repeat2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-bold">Convite de Troca</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {swap.from_user.name} quer trocar com você
        </p>
      </div>

      <div className="glass rounded-2xl p-5 mb-4">
        <h3 className="font-semibold mb-3">{event.title}</h3>
        <div className="space-y-2 text-sm text-[var(--muted)]">
          <p>📅 <span className="capitalize">{getDayOfWeek(event.date)}</span> – {formatDateBR(event.date)}</p>
          <p>🕐 {event.time}</p>
          <p>{emoji} {label}</p>
        </div>
      </div>

      {!user ? (
        <div className="text-center">
          <p className="text-sm text-[var(--muted)] mb-4">
            Faça login primeiro para aceitar a troca
          </p>
          <button
            onClick={() => router.push('/cadastro')}
            className="btn-press px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-semibold text-sm"
          >
            Fazer login
          </button>
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={handleReject}
            disabled={processing}
            className="btn-press flex-1 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-[var(--muted)] font-semibold text-sm hover:text-red-400 hover:border-red-500/40 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Recusar
          </button>
          <button
            onClick={handleAccept}
            disabled={processing}
            className="btn-press flex-1 py-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
          >
            {processing ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                Aceitar
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
