'use client';

interface CalendarToggleProps {
  view: 'monthly' | 'weekly';
  onToggle: (view: 'monthly' | 'weekly') => void;
}

export default function CalendarToggle({ view, onToggle }: CalendarToggleProps) {
  return (
    <div className="relative flex items-center bg-[var(--surface)] rounded-xl p-1 w-full max-w-[220px]">
      <div
        className="absolute top-1 bottom-1 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] transition-all duration-300 ease-out"
        style={{
          left: view === 'monthly' ? '4px' : '50%',
          width: 'calc(50% - 4px)',
        }}
      />
      <button
        onClick={() => onToggle('monthly')}
        className={`relative z-10 flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
          view === 'monthly' ? 'text-white' : 'text-[var(--muted)]'
        }`}
      >
        📅 Mensal
      </button>
      <button
        onClick={() => onToggle('weekly')}
        className={`relative z-10 flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
          view === 'weekly' ? 'text-white' : 'text-[var(--muted)]'
        }`}
      >
        📆 Semanal
      </button>
    </div>
  );
}
