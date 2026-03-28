'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/layout/Toast';
import { ArrowLeft, Plus, Calendar, Clock, Type } from 'lucide-react';

export default function CriarEventoPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !time) {
      showToast('Preencha todos os campos', 'error');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      const { data: eventData, error } = await supabase
        .from('events')
        .insert({ title: title.trim(), date, time })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          showToast('Já existe um evento nesta data e horário', 'error');
          return;
        }
        throw error;
      }

      // Create default roles
      await supabase.from('event_roles').insert([
        { event_id: eventData.id, role: 'camera' },
        { event_id: eventData.id, role: 'mesa' },
      ]);

      showToast('Evento criado com sucesso! 🎉', 'success');
      router.push('/admin');
    } catch (err) {
      showToast(`Erro: ${(err as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-4 animate-fade-in">
      <button
        onClick={() => router.push('/admin')}
        className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4 btn-press"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <div className="flex items-center gap-2 mb-6">
        <Plus className="w-6 h-6 text-emerald-400" />
        <h1 className="text-xl font-bold">Criar Evento</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="title" className="text-xs font-medium text-[var(--muted)]">Título do evento</label>
            <div className="relative">
              <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              <input
                id="title"
                type="text"
                placeholder="Ex: Missa Dominical"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-sm placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="date" className="text-xs font-medium text-[var(--muted)]">Data</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="time" className="text-xs font-medium text-[var(--muted)]">Horário</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              <input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all"
                required
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-press w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Criando...
            </span>
          ) : (
            'Criar Evento'
          )}
        </button>

        <p className="text-[10px] text-[var(--muted)] text-center mt-3">
          As funções Câmera e Mesa serão criadas automaticamente.
        </p>
      </form>
    </div>
  );
}
