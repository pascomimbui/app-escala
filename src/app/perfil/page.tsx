'use client';

import { useUser } from '@/components/layout/UserContext';
import { useToast } from '@/components/layout/Toast';
import { formatPhone } from '@/lib/utils';
import { Radio, LogOut, Phone, User as UserIcon, Calendar, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PerfilPage() {
  const { user, logout } = useUser();
  const { showToast } = useToast();
  const router = useRouter();

  if (!user) {
    router.push('/cadastro');
    return null;
  }

  const handleLogout = () => {
    logout();
    showToast('Você saiu do sistema', 'info');
    router.push('/cadastro');
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 animate-fade-in">
      {/* Profile Card */}
      <div className="glass rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-2xl font-bold text-white shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{user.name}</h2>
            <p className="text-sm text-[var(--muted)] flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              {formatPhone(user.phone)}
            </p>
            {user.is_admin && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-[10px] font-semibold">
                <Shield className="w-3 h-3" />
                Administrador
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--surface)] rounded-xl p-4 text-center">
            <Calendar className="w-5 h-5 text-[var(--primary)] mx-auto mb-1.5" />
            <p className="text-[10px] text-[var(--muted)]">Membro desde</p>
            <p className="text-xs font-semibold">
              {new Date(user.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="bg-[var(--surface)] rounded-xl p-4 text-center">
            <Radio className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
            <p className="text-[10px] text-[var(--muted)]">Status</p>
            <p className="text-xs font-semibold text-emerald-400">Ativo</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {user.is_admin && (
          <button
            onClick={() => router.push('/admin')}
            className="btn-press w-full flex items-center gap-3 px-4 py-3.5 rounded-xl glass hover:bg-[var(--surface-hover)] transition-colors"
          >
            <Shield className="w-5 h-5 text-[var(--accent)]" />
            <span className="text-sm font-medium">Painel Administrativo</span>
          </button>
        )}
        <button
          onClick={handleLogout}
          className="btn-press w-full flex items-center gap-3 px-4 py-3.5 rounded-xl glass hover:bg-red-500/10 transition-colors group"
        >
          <LogOut className="w-5 h-5 text-[var(--muted)] group-hover:text-red-400 transition-colors" />
          <span className="text-sm font-medium text-[var(--muted)] group-hover:text-red-400 transition-colors">
            Sair da conta
          </span>
        </button>
      </div>

      <p className="text-[10px] text-[var(--muted)] text-center mt-8">
        ID: {user.id.slice(0, 8)}...
      </p>
    </div>
  );
}
