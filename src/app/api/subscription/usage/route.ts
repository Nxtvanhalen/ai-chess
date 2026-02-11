import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getUserTier, getUserUsage } from '@/lib/supabase/subscription';

export async function GET() {
  const start = Date.now();
  try {
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
              // Server Component context
            }
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Fetch usage, tier, and rating in parallel
    const [usage, plan, profileResult] = await Promise.all([
      getUserUsage(user.id),
      getUserTier(user.id),
      supabase.from('user_profiles').select('rating').eq('id', user.id).single(),
    ]);

    const rating = profileResult.data?.rating ?? 1200;

    console.log(`[Usage API] Fetched in ${Date.now() - start}ms`, JSON.stringify({ ...usage, plan, rating }));

    return NextResponse.json(
      {
        ...usage,
        plan,
        rating,
      },
      {
        headers: {
          // Never let browser cache this - balance changes on every AI move
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    console.error('[Usage API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
  }
}
