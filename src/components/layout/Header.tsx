'use client';

import { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import { Radio, LogOut, Shield, Bell } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Header() {
  const { user, logout } = useUser();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notifications for admins
  useEffect(() => {
    if (!user?.is_admin) return;

    const fetchNotifications = async () => {
      try {
        const supabase = createClient();
        // Get withdrawal notifications from the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { count } = await supabase
          .from('notification_log')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'withdrawal')
          .eq('user_id', user.id)
          .gte('sent_at', sevenDaysAgo.toISOString());

        setUnreadCount(count || 0);
      } catch {
        // Silently fail - table might not exist yet
      }
    };

    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    logout();
    router.push('/cadastro');
  };

  return (
    <header className="glass-strong sticky top-0 z-50 px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center group-hover:scale-105 transition-transform">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight leading-none">Escala PASCOM</h1>
            <p className="text-[10px] text-[var(--muted)] leading-none mt-0.5">Transmissão</p>
          </div>
        </Link>

        {user && (
          <div className="flex items-center gap-2">
            {user.is_admin && (
              <>
                <button
                  onClick={() => router.push('/admin')}
                  className="relative w-8 h-8 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] flex items-center justify-center transition-colors"
                  title="Notificações"
                >
                  <Bell className="w-4 h-4 text-[var(--muted)]" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <Link
                  href="/admin"
                  className="w-8 h-8 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] flex items-center justify-center transition-colors"
                  title="Painel Admin"
                >
                  <Shield className="w-4 h-4 text-[var(--accent)]" />
                </Link>
              </>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface)]">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-[10px] font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium max-w-[80px] truncate">{user.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-lg bg-[var(--surface)] hover:bg-red-500/20 flex items-center justify-center transition-colors group"
              title="Sair"
            >
              <LogOut className="w-4 h-4 text-[var(--muted)] group-hover:text-red-400 transition-colors" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
