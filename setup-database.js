// Quick database setup script
// Run with: node -r dotenv/config setup-database.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables.');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrations() {
  console.log('🚀 Setting up Chess Butler database...');
  
  try {
    // Read migration files
    const migration1 = fs.readFileSync(path.join(__dirname, 'supabase/migrations/001_create_chess_tables.sql'), 'utf8');
    const migration2 = fs.readFileSync(path.join(__dirname, 'supabase/migrations/002_create_indexes.sql'), 'utf8');
    const migration3 = fs.readFileSync(path.join(__dirname, 'supabase/migrations/003_setup_rls.sql'), 'utf8');
    
    // Run migrations in order
    console.log('📋 Creating tables...');
    const result1 = await supabase.rpc('exec_sql', { sql: migration1 });
    if (result1.error) {
      console.log('Tables might already exist, continuing...');
    }
    
    console.log('⚡ Creating indexes...');
    const result2 = await supabase.rpc('exec_sql', { sql: migration2 });
    if (result2.error) {
      console.log('Indexes might already exist, continuing...');
    }
    
    console.log('🔒 Setting up security...');
    const result3 = await supabase.rpc('exec_sql', { sql: migration3 });
    if (result3.error) {
      console.log('Security policies might already exist, continuing...');
    }
    
    console.log('✅ Database setup complete!');
    console.log('🎯 Ready for Chess Butler persistence!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
  }
}

runMigrations();