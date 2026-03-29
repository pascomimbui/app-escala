'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/layout/Toast';
import { useUser } from '@/components/layout/UserContext';
import { ArrowLeft, RefreshCw, Smartphone, QrCode, LogOut, CheckCircle, WifiOff } from 'lucide-react';

interface ConnectionStatus {
  state: 'open' | 'connecting' | 'not_found' | 'error' | 'unknown';
  data?: Record<string, unknown>;
}

export default function WhatsAppAdminPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { showToast } = useToast();
  
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  useEffect(() => {
    if (!userLoading && (!user || !user.is_admin)) {
      router.push('/');
    }
  }, [user, userLoading, router]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      setStatus(data);
      if (data.state === 'not_found' || data.state === 'connecting') {
         // Create or get instance if not connected
         handleConnect();
      }
    } catch {
      showToast('Erro ao buscar status do Evolution API', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.is_admin) {
      fetchStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_instance' })
      });
      const data = await res.json();
      if (data.qrcode?.base64) {
        setQrCodeData(data.qrcode.base64);
        setStatus({ state: 'connecting' });
      } else {
        fetchStatus();
      }
    } catch {
      showToast('Erro ao gerar QRCode', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Deseja realmente desconectar o número atual?')) return;
    setLoading(true);
    try {
      await fetch('/api/whatsapp/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
      showToast('Instância desconectada', 'info');
      setQrCodeData(null);
      fetchStatus();
    } catch {
      showToast('Erro ao desconectar', 'error');
      setLoading(false);
    }
  };

  if (!user || !user.is_admin) return null;

  const isConnected = status?.state === 'open';

  return (
    <div className="max-w-lg mx-auto px-4 py-8 animate-fade-in">
      <button
        onClick={() => router.push('/admin')}
        className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-6 btn-press"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Painel
      </button>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isConnected ? 'bg-emerald-500/20' : 'bg-[var(--surface)]'}`}>
            <Smartphone className={`w-6 h-6 ${isConnected ? 'text-emerald-400' : 'text-[var(--muted)]'}`} />
          </div>
          <div>
            <h1 className="text-xl font-bold">WhatsApp Bot</h1>
            <p className="text-xs text-[var(--muted)] border border-[var(--border-color)] px-2 py-0.5 rounded-full inline-block mt-1">
              Evolution API
            </p>
          </div>
        </div>
        <button 
          onClick={fetchStatus}
          disabled={loading}
          className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors"
        >
          <RefreshCw className={`w-5 h-5 text-[var(--muted)] ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          Status da Conexão
        </h2>

        {loading && !status ? (
          <div className="flex items-center justify-center py-8">
            <span className="w-8 h-8 border-4 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center py-6 text-center ${isConnected ? 'text-emerald-400' : 'text-[var(--muted)]'}`}>
            {isConnected ? (
              <>
                <CheckCircle className="w-16 h-16 mb-4 animate-scale-in" />
                <h3 className="text-lg font-bold text-[var(--foreground)]">Conectado e Operante</h3>
                <p className="text-xs mt-1 text-[var(--muted)]">
                  O sistema está pronto para enviar lembretes.
                </p>
              </>
            ) : status?.state === 'not_found' || status?.state === 'unknown' ? (
              <>
                <WifiOff className="w-16 h-16 mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-[var(--foreground)]">Instância Desligada</h3>
                <p className="text-xs mt-1 text-[var(--muted)] max-w-xs">
                  Sua Evolution API não foi encontrada ou está caída no momento. Confirme o arquivo .env.local e reinicie.
                </p>
              </>
            ) : qrCodeData ? (
              <>
                <div className="bg-white p-4 rounded-xl mb-4 animate-scale-in">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeData} alt="WhatsApp QR Code" className="w-48 h-48" />
                </div>
                <h3 className="text-lg font-bold text-[var(--foreground)]">Leia o QR Code</h3>
                <p className="text-xs mt-1 text-[var(--muted)] max-w-xs">
                  Abra o WhatsApp no celular do administrador » Aparelhos Conectados » Conectar.
                </p>
              </>
            ) : (
              <>
                <QrCode className="w-16 h-16 mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-[var(--foreground)]">Aguardando Conexão</h3>
                <p className="text-xs mt-1 text-[var(--muted)]">Iniciando pareamento...</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {isConnected && (
          <button
            onClick={handleDisconnect}
            className="btn-press w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-red-500/20 text-red-400 font-semibold text-sm hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Desconectar WhatsApp
          </button>
        )}
      </div>
    </div>
  );
}
