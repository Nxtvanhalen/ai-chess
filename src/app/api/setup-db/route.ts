import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Tables SQL
    const createTablesSQL = `
      -- Games table
      CREATE TABLE IF NOT EXISTS games (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
        pgn TEXT,
        fen TEXT,
        player_color VARCHAR(5) DEFAULT 'white' CHECK (player_color IN ('white', 'black')),
        result VARCHAR(10),
        metadata JSONB DEFAULT '{}'::jsonb
      );

      -- Moves table
      CREATE TABLE IF NOT EXISTS moves (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id UUID REFERENCES games(id) ON DELETE CASCADE,
        move_number INTEGER NOT NULL,
        move_notation VARCHAR(10) NOT NULL,
        fen_before TEXT NOT NULL,
        fen_after TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        player_type VARCHAR(10) NOT NULL CHECK (player_type IN ('human', 'ai')),
        analysis JSONB DEFAULT '{}'::jsonb
      );

      -- Conversations table
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id UUID REFERENCES games(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        message_count INTEGER DEFAULT 0,
        summary TEXT
      );

      -- Messages table
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb
      );

      -- Memory table
      CREATE TABLE IF NOT EXISTS memory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        category VARCHAR(50) NOT NULL CHECK (category IN ('game_pattern', 'conversation', 'preference', 'coaching', 'player_style')),
        content TEXT NOT NULL,
        context JSONB DEFAULT '{}'::jsonb,
        relevance_score FLOAT DEFAULT 0.0,
        last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: createTablesSQL });
    
    if (error) {
      console.error('Database setup error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Chess Butler database setup complete!',
      data 
    });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ 
      error: 'Failed to setup database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}