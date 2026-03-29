'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/layout/Toast';
import { useUser } from '@/components/layout/UserContext';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Radio, CalendarPlus, CheckCircle, RefreshCw, Layers } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface YouTubeEvent {
  title: string;
  videoId: string;
  startTime: number;
  thumbnail: string;
}

export default function YouTubeTransmissionsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { showToast } = useToast();

  const [events, setEvents] = useState<YouTubeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [syncedVideoIds, setSyncedVideoIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userLoading && (!user || !user.is_admin)) {
      router.push('/');
    }
  }, [user, userLoading, router]);

  const fetchYoutubeAndSyncedKeys = async () => {
    setLoading(true);
    try {
      // 1. Fetch Youtube Scheduled
      const res = await fetch('/api/youtube');
      if (!res.ok) throw new Error('Falha ao buscar YouTube');
      const data = await res.json();
      const ytEvents: YouTubeEvent[] = data.events || [];
      setEvents(ytEvents);

      // 2. Fetch existing local events to avoid duplicates
      // YouTube title can be dynamic, but we can check if there's an event on the EXACT same day/time roughly
      // Actually, we can add youtube_id to events table eventually, but for now we'll match by Date/Time
      // Or simply store the Youtube IDs in localStorage for visual sync state for MVP
      const supabase = createClient();
      const { data: dbEvents } = await supabase.from('events').select('date, time, title');
      
      const synced = new Set<string>();
      if (dbEvents) {
        ytEvents.forEach(yt => {
          const ytDate = format(new Date(yt.startTime * 1000), 'yyyy-MM-dd');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const exists = dbEvents.some((d: any) => d.date === ytDate);
          if (exists) synced.add(yt.videoId);
        });
      }
      setSyncedVideoIds(synced);

    } catch {
      showToast('Erro ao buscar transmissões do YouTube', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.is_admin) {
      fetchYoutubeAndSyncedKeys();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleImport = async (ytEvent: YouTubeEvent) => {
    setImportingId(ytEvent.videoId);
    try {
      const eventDate = new Date(ytEvent.startTime * 1000);
      const dateStr = format(eventDate, 'yyyy-MM-dd');
      const timeStr = format(eventDate, 'HH:mm');
      
      // Clean title if needed
      let cleanTitle = ytEvent.title;
      // Strip "Transmissão Ao Vivo -" or similar if preferred, but keeping it is fine
      if (cleanTitle.length > 50) cleanTitle = cleanTitle.substring(0, 50) + '...';

      const supabase = createClient();
      
      const { data: eventData, error } = await supabase
        .from('events')
        .insert({ 
          title: cleanTitle, 
          date: dateStr, 
          time: timeStr,
          youtube_thumbnail: ytEvent.thumbnail || null
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          showToast('Um evento para este dia e horário já existe', 'error');
          setSyncedVideoIds(prev => new Set(prev).add(ytEvent.videoId));
          return;
        }
        throw error;
      }

      // Create default roles
      await supabase.from('event_roles').insert([
        { event_id: eventData.id, role: 'camera' },
        { event_id: eventData.id, role: 'mesa' },
      ]);

      showToast('Evento importado e criado! 🎉', 'success');
      setSyncedVideoIds(prev => new Set(prev).add(ytEvent.videoId));
    } catch {
      showToast('Erro ao importar evento', 'error');
    } finally {
      setImportingId(null);
    }
  };

  const handleImportAll = async () => {
    const pendings = events.filter(e => !syncedVideoIds.has(e.videoId));
    if (pendings.length === 0) return;
    
    // Quick sequential import
    for (const p of pendings) {
      await handleImport(p);
    }
  };

  if (!user || !user.is_admin) return null;

  const unsyncedCount = events.filter(e => !syncedVideoIds.has(e.videoId)).length;

  return (
    <div className="max-w-xl mx-auto px-4 py-8 animate-fade-in">
      <button
        onClick={() => router.push('/admin')}
        className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-6 btn-press"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Painel
      </button>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <Radio className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">LIVES YouTube</h1>
            <p className="text-xs text-[var(--muted)] flex items-center gap-1 mt-1">
              Santuário Aparecida
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {events.length > 0 && unsyncedCount > 0 && (
            <button
              onClick={handleImportAll}
              disabled={!!importingId}
              className="btn-press hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
            >
              <Layers className="w-3.5 h-3.5" />
              Importar {unsyncedCount}
            </button>
          )}
          <button 
            onClick={fetchYoutubeAndSyncedKeys}
            disabled={loading || !!importingId}
            className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-[var(--muted)] ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-2xl w-full" />)
        ) : events.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <Radio className="w-10 h-10 text-[var(--muted)] mx-auto mb-3 opacity-50" />
            <h3 className="text-sm font-bold">Nenhuma Live Agendada</h3>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
              O sistema buscou no canal, mas não encontrou nenhuma transmissão ao vivo programada para o futuro.
            </p>
          </div>
        ) : (
          events.map((evt) => {
            const date = new Date(evt.startTime * 1000);
            const isSynced = syncedVideoIds.has(evt.videoId);
            const isImporting = importingId === evt.videoId;

            return (
              <div key={evt.videoId} className={`glass rounded-2xl p-4 flex gap-4 transition-all ${isSynced ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                <div className="w-24 h-16 rounded-lg bg-[var(--surface-hover)] overflow-hidden shrink-0 relative flex items-center justify-center">
                  {evt.thumbnail ? (
                    <Image src={evt.thumbnail} alt="thumb" className="w-full h-full object-cover" fill unoptimized />
                  ) : (
                    <Radio className="w-6 h-6 text-[var(--muted)] opacity-30" />
                  )}
                  <div className="absolute bottom-1 right-1 bg-black/80 text-[8px] font-bold px-1.5 py-0.5 rounded text-white">
                    LIVE
                  </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="text-sm font-bold truncate mb-1" title={evt.title}>{evt.title}</h3>
                  <div className="text-[10px] text-[var(--muted)] flex items-center gap-1.5">
                    <span className="font-semibold text-[var(--foreground)]">
                      {format(date, "dd 'de' MMM", { locale: ptBR })}
                    </span>
                    <span>•</span>
                    <span>{format(date, 'HH:mm')}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center shrink-0">
                  {isSynced ? (
                    <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold px-3 py-2 bg-emerald-500/10 rounded-xl">
                      <CheckCircle className="w-4 h-4" />
                      Sincronizado
                    </div>
                  ) : (
                    <button
                      onClick={() => handleImport(evt)}
                      disabled={!!importingId}
                      className="btn-press flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-[11px] font-semibold hover:opacity-90 disabled:opacity-50 shadow-lg shadow-[var(--primary)]/20 transition-all"
                    >
                      {isImporting ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <CalendarPlus className="w-4 h-4" />
                          Criar Evento
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
