'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/layout/Toast';
import { FileJson, CheckCircle, AlertCircle, Save, Loader2, Play } from 'lucide-react';
import type { User } from '@/lib/types';
import { format } from 'date-fns';

interface EscalaJSON {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  camera?: string;
  mesa?: string;
}

interface PreviewRow {
  id: string; // randomly generated local id
  original: EscalaJSON;
  eventId: string | null;
  cameraRoleId: string | null;
  mesaRoleId: string | null;
  existingCameraUserId: string | null; // already assigned
  existingMesaUserId: string | null;   // already assigned
  selectedCameraUserId: string; // empty means "Don't assign / Not found"
  selectedMesaUserId: string;
  status: 'pending' | 'ready' | 'event_not_found' | 'saved' | 'saving' | 'error';
  errorMsg?: string;
}

export default function ImportarEscalas() {
  const { showToast } = useToast();
  const [jsonText, setJsonText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [previewVars, setPreviewVars] = useState<PreviewRow[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isSavingAll, setIsSavingAll] = useState(false);

  useEffect(() => {
    async function loadUsers() {
      const supabase = createClient();
      const { data } = await supabase.from('users').select('*').order('name');
      if (data) setUsers(data as User[]);
    }
    loadUsers();
  }, []);

  const findBestUserMatch = (name: string | undefined): string => {
    if (!name) return '';
    const cleanName = name.toLowerCase().trim();
    if (!cleanName) return '';

    // Exact Match
    const exact = users.find(u => u.name.toLowerCase().trim() === cleanName);
    if (exact) return exact.id;

    // Inclusion Match (e.g. "Joao Silva" includes "Joao")
    const incl = users.find(u => {
      const dbName = u.name.toLowerCase().trim();
      return dbName.includes(cleanName) || cleanName.includes(dbName);
    });
    if (incl) return incl.id;

    return '';
  };

  const handleParse = async () => {
    if (!jsonText.trim()) {
      showToast('Cole o JSON primeiro', 'error');
      return;
    }

    setIsParsing(true);
    try {
      let parsed: EscalaJSON[];
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        throw new Error('JSON inválido. Verifique a sintaxe.');
      }

      if (!Array.isArray(parsed)) {
        throw new Error('O JSON deve ser um array: [...]');
      }

      const supabase = createClient();
      // Fetch all upcoming events directly
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          id, date, time, title,
          event_roles (
            id, role,
            assignments ( user_id )
          )
        `)
        .gte('date', today);

      if (error) throw error;

      const rows: PreviewRow[] = parsed.map((item, idx) => {
        const rowId = `row_${idx}_${Date.now()}`;
        const evt = (eventsData || []).find(e => e.date === item.date && e.time === item.time);
        
        let eventId = null;
        let cameraRoleId = null;
        let mesaRoleId = null;
        let existingCam = null;
        let existingMesa = null;
        let mappedCam = '';
        let mappedMesa = '';
        let status: PreviewRow['status'] = 'ready';

        if (evt) {
          eventId = evt.id;
          const roles = (evt.event_roles || []) as any[];
          
          const camRole = roles.find(r => r.role === 'camera');
          if (camRole) {
            cameraRoleId = camRole.id;
            if (camRole.assignments && camRole.assignments.length > 0) {
              existingCam = camRole.assignments[0].user_id;
            }
          }

          const mesaRole = roles.find(r => r.role === 'mesa');
          if (mesaRole) {
            mesaRoleId = mesaRole.id;
            if (mesaRole.assignments && mesaRole.assignments.length > 0) {
              existingMesa = mesaRole.assignments[0].user_id;
            }
          }

          // Don't override if already existing
          mappedCam = existingCam ? existingCam : findBestUserMatch(item.camera);
          mappedMesa = existingMesa ? existingMesa : findBestUserMatch(item.mesa);

        } else {
          status = 'event_not_found';
        }

        return {
          id: rowId,
          original: item,
          eventId,
          cameraRoleId,
          mesaRoleId,
          existingCameraUserId: existingCam,
          existingMesaUserId: existingMesa,
          selectedCameraUserId: mappedCam,
          selectedMesaUserId: mappedMesa,
          status
        };
      });

      setPreviewVars(rows);
      showToast('JSON pareado com sucesso', 'success');
      
    } catch (err: any) {
      showToast(err.message || 'Erro ao processar', 'error');
    } finally {
      setIsParsing(false);
    }
  };

  const handleUserSelect = (rowId: string, role: 'camera' | 'mesa', userId: string) => {
    setPreviewVars(prev => prev.map(r => {
      if (r.id === rowId) {
        return { ...r, [role === 'camera' ? 'selectedCameraUserId' : 'selectedMesaUserId']: userId };
      }
      return r;
    }));
  };

  const handleSaveAll = async () => {
    const pendings = previewVars.filter(r => r.status === 'ready');
    if (pendings.length === 0) return;

    setIsSavingAll(true);
    let successCount = 0;
    const supabase = createClient();

    const updatedRows = [...previewVars];

    for (const row of pendings) {
      const rowIndex = updatedRows.findIndex(r => r.id === row.id);
      if (rowIndex === -1) continue;

      updatedRows[rowIndex].status = 'saving';
      setPreviewVars([...updatedRows]);

      try {
        const inserts: any[] = [];
        // Insert Camera if changed and empty
        if (row.cameraRoleId && row.selectedCameraUserId && row.selectedCameraUserId !== row.existingCameraUserId) {
          inserts.push({ event_role_id: row.cameraRoleId, user_id: row.selectedCameraUserId });
        }
        // Insert Mesa if changed and empty
        if (row.mesaRoleId && row.selectedMesaUserId && row.selectedMesaUserId !== row.existingMesaUserId) {
          inserts.push({ event_role_id: row.mesaRoleId, user_id: row.selectedMesaUserId });
        }

        if (inserts.length > 0) {
          const { error } = await supabase.from('assignments').insert(inserts);
          if (error) {
            console.error("Insert error:", error);
            // Ignore unique constraint errors
            if (error.code !== '23505') throw error;
          }
        }

        updatedRows[rowIndex].status = 'saved';
        successCount++;
      } catch (err: any) {
        updatedRows[rowIndex].status = 'error';
        updatedRows[rowIndex].errorMsg = 'Falha ao salvar';
      }
      
      setPreviewVars([...updatedRows]);
    }

    setIsSavingAll(false);
    showToast(`${successCount} eventos escalados!`, 'success');
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-4">
        <label className="text-xs font-semibold text-[var(--muted)] flex items-center gap-2 mb-2">
          <FileJson className="w-4 h-4" />
          JSON de Escalas
        </label>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder="[{ &#34;date&#34;: &#34;YYYY-MM-DD&#34;, &#34;time&#34;: &#34;HH:mm&#34;, &#34;camera&#34;: &#34;Nome&#34;, &#34;mesa&#34;: &#34;Nome&#34; }]"
          className="w-full h-32 bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border-color)] rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-[var(--primary)] transition-colors resize-none mb-3"
          spellCheck={false}
        />
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[var(--muted)] max-w-[60%]">
            Cole as escalas. Datas devem coincidir com eventos existentes.
          </p>
          <button
            onClick={handleParse}
            disabled={isParsing || !jsonText}
            className="btn-press bg-[var(--surface-hover)] hover:bg-[var(--primary)] hover:text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-50"
          >
            {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analisar Matches'}
          </button>
        </div>
      </div>

      {previewVars.length > 0 && (
        <div className="animate-fade-in space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold flex items-center gap-2">
              Pré-visualização
              <span className="bg-[var(--primary)]/20 text-[var(--primary)] text-[10px] px-2 py-0.5 rounded-full">
                {previewVars.length}
              </span>
            </h3>
            <button
              onClick={handleSaveAll}
              disabled={isSavingAll || previewVars.filter(r => r.status === 'ready').length === 0}
              className="btn-press flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              {isSavingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Escalas
            </button>
          </div>

          <div className="space-y-2">
            {previewVars.map((row) => (
              <div key={row.id} className="glass rounded-2xl p-3 flex flex-col gap-3">
                
                {/* Header Status */}
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono bg-[var(--surface)] px-2 py-1 rounded-md">
                      {format(new Date(row.original.date + 'T12:00:00'), 'dd/MM')} às {row.original.time}
                    </span>
                    {row.status === 'event_not_found' && (
                      <span className="flex items-center gap-1 text-[10px] text-red-400 font-semibold bg-red-400/10 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3 h-3" /> Evento sumiu
                      </span>
                    )}
                    {row.status === 'saved' && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-400/10 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Salvo
                      </span>
                    )}
                  </div>
                </div>

                {/* Body Matches */}
                {(row.status === 'ready' || row.status === 'saved' || row.status === 'saving' || row.status === 'error') && (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Camera */}
                    <div className="space-y-1 relative">
                      <label className="text-[10px] text-[var(--muted)] block">
                        🎥 JSON: <span className="text-[var(--foreground)]">{row.original.camera || 'Vazio'}</span>
                      </label>
                      <select
                        value={row.selectedCameraUserId}
                        onChange={(e) => handleUserSelect(row.id, 'camera', e.target.value)}
                        disabled={row.existingCameraUserId !== null || row.status === 'saved' || row.status === 'saving'}
                        className={`w-full bg-[var(--surface)] text-[11px] font-medium border border-[var(--border-color)] rounded-lg p-2 focus:outline-none focus:border-[var(--primary)] ${row.existingCameraUserId ? 'opacity-50' : ''}`}
                      >
                        <option value="">-- Ignorar / Vazio --</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                      {row.existingCameraUserId && (
                        <div className="absolute top-1/2 left-0 w-full h-full flex items-center justify-center bg-[var(--surface)]/80 backdrop-blur-[1px] rounded-lg text-[9px] font-bold text-amber-400 border border-amber-400/20">
                          JÁ PREENCHIDO
                        </div>
                      )}
                    </div>

                    {/* Mesa */}
                    <div className="space-y-1 relative">
                      <label className="text-[10px] text-[var(--muted)] block">
                        🎛️ JSON: <span className="text-[var(--foreground)]">{row.original.mesa || 'Vazio'}</span>
                      </label>
                      <select
                        value={row.selectedMesaUserId}
                        onChange={(e) => handleUserSelect(row.id, 'mesa', e.target.value)}
                        disabled={row.existingMesaUserId !== null || row.status === 'saved' || row.status === 'saving'}
                        className={`w-full bg-[var(--surface)] text-[11px] font-medium border border-[var(--border-color)] rounded-lg p-2 focus:outline-none focus:border-[var(--primary)] ${row.existingMesaUserId ? 'opacity-50' : ''}`}
                      >
                        <option value="">-- Ignorar / Vazio --</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                      {row.existingMesaUserId && (
                        <div className="absolute top-1/2 left-0 w-full h-full flex items-center justify-center bg-[var(--surface)]/80 backdrop-blur-[1px] rounded-lg text-[9px] font-bold text-amber-400 border border-amber-400/20">
                          JÁ PREENCHIDO
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
