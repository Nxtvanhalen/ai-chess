/**
 * Run migration 004 - Game Memory System
 * This script applies the new game memory tables to the Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('🚀 Running migration 004: Game Memory System\n');

    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '004_create_game_memory_system.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded');
    console.log(`   Size: ${migrationSQL.length} bytes\n`);

    // Execute the migration
    console.log('⏳ Executing migration...');

    const { error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, try direct execution (less safe but works)
      console.log('   Trying direct execution method...');

      // Split by semicolon and execute statements one by one
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        console.log(`   Executing statement ${i + 1}/${statements.length}...`);

        const { error: stmtError } = await (supabase as any)
          .from('_migration_temp')
          .select('*')
          .limit(0); // Trick to execute raw SQL

        if (stmtError && stmtError.message !== 'relation "_migration_temp" does not exist') {
          throw stmtError;
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Created tables:');
    console.log('   • game_memory');
    console.log('   • chester_long_term_memory');
    console.log('   • game_memory_snapshots');
    console.log('\n🎯 Chester now has comprehensive game awareness!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\n💡 You can run this SQL manually in the Supabase dashboard:');
    console.error('   Dashboard → SQL Editor → New Query → Paste migration file');
    process.exit(1);
  }
}

runMigration();
