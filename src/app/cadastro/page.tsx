'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/layout/UserContext';
import { useToast } from '@/components/layout/Toast';
import { createClient } from '@/lib/supabase/client';
import { formatPhone, cleanPhone, isValidPhone } from '@/lib/utils';
import { Radio, UserPlus, Phone, User as UserIcon } from 'lucide-react';

export default function CadastroPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useUser();
  const { showToast } = useToast();
  const router = useRouter();

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhone(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Digite seu nome', 'error');
      return;
    }
    if (!isValidPhone(phone)) {
      showToast('Telefone inválido. Use: (XX) XXXXX-XXXX', 'error');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const cleanedPhone = cleanPhone(phone);

      // Check if phone already exists
      const { data: existing } = await supabase
        .from('users')
        .select('*')
        .eq('phone', cleanedPhone)
        .single();

      if (existing) {
        login(existing);
        showToast(`Bem-vindo de volta, ${existing.name}! 🙏`, 'success');
        router.push('/');
        return;
      }

      // Create new user
      const { data, error } = await supabase
        .from('users')
        .insert({ name: name.trim(), phone: cleanedPhone })
        .select()
        .single();

      if (error) throw error;

      login(data);
      showToast(`Cadastro realizado! Bem-vindo, ${data.name}! 🎉`, 'success');
      router.push('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao cadastrar';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80dvh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center mb-4 animate-pulse-glow">
            <Radio className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Escala PASCOM</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Transmissão da Igreja</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="glass rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[var(--primary)]" />
              Cadastro
            </h2>
            <p className="text-xs text-[var(--muted)]">
              Cadastre-se para se escalar nas transmissões
            </p>

            {/* Name */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-xs font-medium text-[var(--muted)]">
                Nome completo
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-sm placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all"
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-xs font-medium text-[var(--muted)]">
                Telefone (WhatsApp)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <input
                  id="phone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-sm placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all"
                  autoComplete="tel"
                  inputMode="numeric"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-press w-full py-3.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Cadastrando...
              </span>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <p className="text-[10px] text-[var(--muted)] text-center mt-6">
          Se já possui cadastro, use o mesmo telefone para acessar
        </p>
      </div>
    </div>
  );
}
