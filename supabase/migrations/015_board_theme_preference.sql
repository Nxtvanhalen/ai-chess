-- Add board theme preference to user profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS board_theme TEXT DEFAULT NULL;

-- NULL means "use default" (obsidian)
COMMENT ON COLUMN user_profiles.board_theme IS 'Board theme ID (e.g. obsidian, wood). NULL = default.';
