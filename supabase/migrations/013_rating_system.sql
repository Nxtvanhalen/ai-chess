-- =============================================================================
-- MIGRATION 013: Elo Rating System
-- =============================================================================
-- Adds a rating column to user_profiles for Elo-based skill tracking.
-- Default 1200 matches standard chess starting Elo.
-- Run this in the Supabase SQL Editor.
-- =============================================================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS rating INTEGER NOT NULL DEFAULT 1200;
