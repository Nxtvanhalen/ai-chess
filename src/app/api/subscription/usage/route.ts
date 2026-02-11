import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
import { getUserTier, getUserUsage } from '@/lib/supabase/subscription';

/** Allowlisted fields that users can update on their own profile */
const UPDATABLE_FIELDS = new Set(['board_theme']);

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
      supabase.from('user_profiles').select('rating, avatar_url, board_theme').eq('id', user.id).single(),
    ]);

    const rating = profileResult.data?.rating ?? 1200;
    const avatar_url = profileResult.data?.avatar_url ?? null;
    const board_theme = profileResult.data?.board_theme ?? null;

    console.log(`[Usage API] Fetched in ${Date.now() - start}ms`, JSON.stringify({ ...usage, plan, rating, avatar_url, board_theme }));

    return NextResponse.json(
      {
        ...usage,
        plan,
        rating,
        avatar_url,
        board_theme,
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

/**
 * PATCH — Update user preferences (board_theme, etc.)
 */
export async function PATCH(request: NextRequest) {
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

    const body = await request.json();

    // Only allow whitelisted fields
    const updates: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (UPDATABLE_FIELDS.has(key)) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      console.error('[Usage API] PATCH error:', error);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    console.log(`[Usage API] Updated preferences for ${user.id}:`, updates);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Usage API] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
