'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

interface UserContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const stored = localStorage.getItem('escala_user');
      if (!stored) {
        setUser(null);
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(stored) as User;
      const supabase = createClient();
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', parsed.id)
        .single();

      if (data) {
        setUser(data as User);
        localStorage.setItem('escala_user', JSON.stringify(data));
      } else {
        localStorage.removeItem('escala_user');
        setUser(null);
      }
    } catch {
      const stored = localStorage.getItem('escala_user');
      if (stored) {
        setUser(JSON.parse(stored) as User);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback((u: User) => {
    setUser(u);
    localStorage.setItem('escala_user', JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('escala_user');
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}
