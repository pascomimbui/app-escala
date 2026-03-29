'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Hook that subscribes to Supabase Realtime changes on the `assignments` table.
 * Whenever an INSERT, UPDATE, or DELETE happens, it calls the provided `onUpdate` callback.
 *
 * Usage:
 *   useRealtimeEvents(fetchEvents);  // fetchEvents will be called on any assignment change
 */
export function useRealtimeEvents(onUpdate: () => void) {
  const onUpdateRef = useRef(onUpdate);

  // Keep the ref up-to-date so we don't need onUpdate in the deps array
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('assignments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',           // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'assignments',
        },
        () => {
          // Small debounce to avoid rapid-fire re-fetches
          setTimeout(() => {
            onUpdateRef.current();
          }, 300);
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Subscribed to assignments changes');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
