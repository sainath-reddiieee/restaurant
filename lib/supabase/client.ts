import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? {
      getItem: (key: string) => {
        const cookies = document.cookie.split('; ');
        const cookie = cookies.find(c => c.startsWith(`${key}=`));
        return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
      },
      setItem: (key: string, value: string) => {
        document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
      },
      removeItem: (key: string) => {
        document.cookie = `${key}=; path=/; max-age=0`;
      },
    } : undefined,
  },
});
