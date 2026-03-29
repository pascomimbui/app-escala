'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/layout/Toast';
import { ArrowLeft, FileJson, Check, AlertTriangle, Upload } from 'lucide-react';
import type { EventImportSimple } from '@/lib/types';

interface PreviewEvent extends EventImportSimple {
  isDuplicate?: boolean;
  selected?: boolean;
}

export default function AdminEventosPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [jsonInput, setJsonInput] = useState('');
  const [preview, setPreview] = useState<PreviewEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleValidate = async () => {
    setLoading(true);
    try {
      const parsed = JSON.parse(jsonInput);

      let events: EventImportSimple[];
      if (Array.isArray(parsed)) {
        events = parsed;
      } else if (parsed.events && Array.isArray(parsed.events)) {
        events = parsed.events;
      } else {
        throw new Error('Formato inválido');
      }

      // Validate each event
      for (const event of events) {
        if (!event.date || !event.title || !event.time) {
          throw new Error(`Evento inválido: cada evento precisa de date, title e time`);
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
          throw new Error(`Data inválida: ${event.date}. Use formato YYYY-MM-DD`);
        }
        if (!/^\d{2}:\d{2}$/.test(event.time)) {
          throw new Error(`Hora inválida: ${event.time}. Use formato HH:mm`);
        }
      }

      // Check for duplicates in database
      const supabase = createClient();
      const { data: existing } = await supabase
        .from('events')
        .select('date, time')
        .in('date', events.map((e) => e.date));

      const existingSet = new Set(
        (existing || []).map((e: { date: string; time: string }) => `${e.date}_${e.time}`)
      );

      const previewEvents: PreviewEvent[] = events.map((e) => ({
        ...e,
        isDuplicate: existingSet.has(`${e.date}_${e.time}`),
        selected: !existingSet.has(`${e.date}_${e.time}`),
      }));

      setPreview(previewEvents);

      const duplicates = previewEvents.filter((e) => e.isDuplicate).length;
      if (duplicates > 0) {
        showToast(`${duplicates} evento(s) duplicado(s) encontrado(s)`, 'info');
      } else {
        showToast(`${events.length} evento(s) validado(s) ✓`, 'success');
      }
    } catch (err) {
      const message = err instanceof SyntaxError ? 'JSON inválido' : (err as Error).message;
      showToast(message, 'error');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleEvent = (index: number) => {
    setPreview((prev) =>
      prev?.map((e, i) => (i === index ? { ...e, selected: !e.selected } : e)) || null
    );
  };

  const handleSave = async () => {
    if (!preview) return;
    const selected = preview.filter((e) => e.selected && !e.isDuplicate);
    if (selected.length === 0) {
      showToast('Nenhum evento selecionado para importar', 'error');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      for (const event of selected) {
        // Insert event
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .insert({ title: event.title, date: event.date, time: event.time })
          .select()
          .single();

        if (eventError) {
          if (eventError.code === '23505') continue; // Skip duplicate
          throw eventError;
        }

        // Create default roles (camera + mesa)
        await supabase.from('event_roles').insert([
          { event_id: eventData.id, role: 'camera' },
          { event_id: eventData.id, role: 'mesa' },
        ]);
      }

      showToast(`${selected.length} evento(s) importado(s) com sucesso! 🎉`, 'success');
      setJsonInput('');
      setPreview(null);
    } catch (err) {
      showToast(`Erro ao salvar: ${(err as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const exampleJson = `[
  {
    "date": "2026-04-03",
    "title": "Celebração da Paixão do Senhor",
    "time": "16:00"
  },
  {
    "date": "2026-04-04",
    "title": "Vigília Pascal",
    "time": "18:00"
  },
  {
    "date": "2026-04-05",
    "title": "Domingo da Páscoa",
    "time": "09:30"
  }
]`;

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
        <FileJson className="w-6 h-6 text-[var(--primary)]" />
        <h1 className="text-xl font-bold">Importar Eventos</h1>
      </div>

      {/* JSON Input */}
      <div className="glass rounded-2xl p-4 mb-4">
        <label className="text-xs font-semibold text-[var(--muted)] mb-2 block">
          Cole o JSON com os eventos:
        </label>
        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder={exampleJson}
          rows={10}
          className="w-full bg-[var(--surface)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs font-mono placeholder:text-[var(--muted)]/30 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all resize-y"
          spellCheck={false}
        />

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleValidate}
            disabled={!jsonInput.trim() || loading}
            className="btn-press flex-1 py-2.5 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                Validar
              </>
            )}
          </button>

          <button
            onClick={() => setJsonInput(exampleJson)}
            className="btn-press px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--muted)] text-xs font-semibold hover:text-[var(--foreground)] transition-colors"
          >
            Exemplo
          </button>
        </div>
      </div>

      {/* Preview Table */}
      {preview && (
        <div className="glass rounded-2xl p-4 mb-4 animate-scale-in">
          <h3 className="text-sm font-semibold mb-3">
            Preview ({preview.filter((e) => e.selected && !e.isDuplicate).length} de {preview.length})
          </h3>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {preview.map((event, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  event.isDuplicate
                    ? 'bg-amber-500/10 opacity-60'
                    : event.selected
                    ? 'bg-[var(--surface)]'
                    : 'bg-[var(--surface)] opacity-40'
                }`}
              >
                {!event.isDuplicate && (
                  <button
                    onClick={() => toggleEvent(index)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      event.selected
                        ? 'bg-[var(--primary)] border-[var(--primary)]'
                        : 'border-[var(--border-color)]'
                    }`}
                  >
                    {event.selected && <Check className="w-3 h-3 text-white" />}
                  </button>
                )}
                {event.isDuplicate && (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{event.title}</p>
                  <p className="text-[10px] text-[var(--muted)]">
                    {event.date} às {event.time}
                    {event.isDuplicate && ' — Duplicado'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={saving || preview.filter((e) => e.selected && !e.isDuplicate).length === 0}
            className="btn-press w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Importar {preview.filter((e) => e.selected && !e.isDuplicate).length} evento(s)
              </>
            )}
          </button>
        </div>
      )}

      {/* Help */}
      <div className="glass rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-[var(--muted)] mb-2">Formato aceito:</h3>
        <div className="bg-[var(--surface)] rounded-xl p-3 text-[10px] font-mono text-[var(--muted)] leading-relaxed overflow-x-auto">
          <pre>{`[
  {
    "date": "YYYY-MM-DD",
    "title": "Nome do Evento",
    "time": "HH:mm"
  }
]`}</pre>
        </div>
        <p className="text-[10px] text-[var(--muted)] mt-2">
          As funções <strong>câmera</strong> e <strong>mesa</strong> são criadas automaticamente para cada evento.
        </p>
      </div>
    </div>
  );
}
