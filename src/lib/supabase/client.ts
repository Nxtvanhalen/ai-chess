import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gszdsbzeydvvvzeeqgdn.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzempkc2J6ZXlkdnZ2emVlcWdkbiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM0NzIwMzQ0LCJleHAiOjIwNTAyOTYzNDR9.4KcMvQEP9SYBUKlvdYGAVYcEnyU-7mXejnJL_nWJNPI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For server-side operations that need elevated permissions
export const createAdminClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations');
  }
  return createClient(supabaseUrl, serviceRoleKey);
};