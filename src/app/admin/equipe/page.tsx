'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/layout/Toast';
import { formatPhone } from '@/lib/utils';
import { ArrowLeft, Users, Shield, ShieldOff, Search, FileJson } from 'lucide-react';
import type { User } from '@/lib/types';
import ImportarEscalas from '@/components/admin/ImportarEscalas';

type Tab = 'lista' | 'importar';

export default function EquipePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('lista');

  useEffect(() => {
    async function fetchUsers() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('name');

        if (error) throw error;
        setUsers((data as User[]) || []);
      } catch {
        showToast('Erro ao carregar voluntários', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [showToast]);

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('users')
        .update({ is_admin: !isAdmin })
        .eq('id', userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_admin: !isAdmin } : u))
      );
      showToast(isAdmin ? 'Admin removido' : 'Admin concedido', 'success');
    } catch {
      showToast('Erro ao atualizar', 'error');
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search.replace(/\D/g, ''))
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-4 animate-fade-in">
      <button
        onClick={() => router.push('/admin')}
        className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4 btn-press"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <div className="flex items-center gap-2 mb-4">
        <Users className="w-6 h-6 text-amber-400" />
        <div>
          <h1 className="text-xl font-bold">Equipe & Escalas</h1>
          <p className="text-[10px] text-[var(--muted)]">Gerencie voluntários e delegações</p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex bg-[var(--surface)] p-1 rounded-xl mb-6">
        <button
          onClick={() => setActiveTab('lista')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'lista'
              ? 'bg-[var(--primary)] text-white shadow-md'
              : 'text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <Users className="w-4 h-4" />
          Voluntários
        </button>
        <button
          onClick={() => setActiveTab('importar')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'importar'
              ? 'bg-[var(--primary)] text-white shadow-md'
              : 'text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <FileJson className="w-4 h-4" />
          Importar Escalas
        </button>
      </div>

      {/* CONTENT: LISTA */}
      {activeTab === 'lista' && (
        <div className="animate-fade-in">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-sm placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all"
            />
          </div>

          <div className="space-y-2">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-16 rounded-xl" />
                ))
              : filtered.map((vol) => (
                  <div
                    key={vol.id}
                    className="glass rounded-xl px-4 py-3 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {vol.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate flex items-center gap-1.5">
                        {vol.name}
                        {vol.is_admin && (
                          <Shield className="w-3 h-3 text-[var(--accent)]" />
                        )}
                      </p>
                      <p className="text-[10px] text-[var(--muted)]">
                        {formatPhone(vol.phone)}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleAdmin(vol.id, vol.is_admin)}
                      className={`p-2 rounded-lg transition-colors btn-press ${
                        vol.is_admin
                          ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                          : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]'
                      }`}
                      title={vol.is_admin ? 'Remover admin' : 'Tornar admin'}
                    >
                      {vol.is_admin ? (
                        <ShieldOff className="w-4 h-4" />
                      ) : (
                        <Shield className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}

            {!loading && filtered.length === 0 && (
              <p className="text-center text-sm text-[var(--muted)] py-8">
                {search ? 'Nenhum resultado encontrado' : 'Nenhum voluntário cadastrado'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* CONTENT: IMPORTAR */}
      {activeTab === 'importar' && (
        <div className="animate-fade-in">
          <ImportarEscalas />
        </div>
      )}
    </div>
  );
}
