import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { User } from '@supabase/supabase-js';

export async function getAuthenticatedUser(): Promise<User | null> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from Server Component - cookies can't be set
          }
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireAuth(): Promise<User> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}
