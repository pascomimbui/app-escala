import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (...args) => {
          let newHeaders = new Headers(args[1]?.headers);
          newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
          newHeaders.set('Pragma', 'no-cache');

          return fetch(args[0], {
            ...args[1],
            cache: 'no-store',
            headers: newHeaders
          });
        },
      },
    }
  );
}
