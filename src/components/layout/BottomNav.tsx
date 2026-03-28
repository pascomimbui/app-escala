'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, UserCircle, Shield } from 'lucide-react';
import { useUser } from './UserContext';

const navItems = [
  { href: '/', icon: Calendar, label: 'Escala' },
  { href: '/perfil', icon: UserCircle, label: 'Perfil' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();

  const items = user?.is_admin
    ? [...navItems, { href: '/admin', icon: Shield, label: 'Admin' }]
    : navItems;

  return (
    <nav className="glass-strong fixed bottom-0 left-0 right-0 z-50 px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex items-center justify-around py-2">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${
                isActive
                  ? 'text-[var(--primary)] bg-[var(--primary)]/10'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
