import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gszdsbzeydvvvzeeqgdn.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzemRzYnpleWR2dnZ6ZWVxZ2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNzYyMzEsImV4cCI6MjA2NTk1MjIzMX0.XgTBVpKTyg6IBg6ZedmIDlUMjD2FVxxKkjoRKAzZp3w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For server-side operations that need elevated permissions
export const createAdminClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations');
  }
  return createClient(supabaseUrl, serviceRoleKey);
};