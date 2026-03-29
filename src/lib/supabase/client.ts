import { createBrowserClient } from '@supabase/ssr';

// Provide a safe fallback for location during SSR prerendering.
// @supabase/ssr's createBrowserClient might access `location` internally.
// During Next.js static page generation, `location` is not defined.
if (typeof globalThis.location === 'undefined') {
  Object.defineProperty(globalThis, 'location', {
    value: { href: '', origin: '', hostname: 'localhost' },
    writable: true,
    configurable: true,
  });
}

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  // Return existing singleton if available
  if (client) return client;



  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (...args) => {
          const newHeaders = new Headers(args[1]?.headers);
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

  return client;
}
