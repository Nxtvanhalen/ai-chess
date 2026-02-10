-- =============================================================================
-- MIGRATION 009: Move Balance Bank System
-- =============================================================================
-- Converts from daily_limit/daily_used model to a single balance counter.
-- Moves stack for paid tiers. Free tier resets monthly (non-stacking).
-- Supports one-time move pack purchases ($1 for 50 moves).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add new balance columns
-- -----------------------------------------------------------------------------
ALTER TABLE subscriptions
  ADD COLUMN ai_moves_balance INTEGER,
  ADD COLUMN chat_messages_balance INTEGER;

-- -----------------------------------------------------------------------------
-- 2. Migrate existing data: balance = limit - used (preserve remaining moves)
--    Premium (-1 limit) stays -1 (unlimited)
-- -----------------------------------------------------------------------------
UPDATE subscriptions SET
  ai_moves_balance = CASE
    WHEN daily_ai_moves_limit = -1 THEN -1
    ELSE GREATEST(0, daily_ai_moves_limit - daily_ai_moves_used)
  END,
  chat_messages_balance = CASE
    WHEN daily_chat_messages_limit = -1 THEN -1
    ELSE GREATEST(0, daily_chat_messages_limit - daily_chat_messages_used)
  END;

-- -----------------------------------------------------------------------------
-- 3. Make columns NOT NULL with defaults for new users
-- -----------------------------------------------------------------------------
ALTER TABLE subscriptions
  ALTER COLUMN ai_moves_balance SET NOT NULL,
  ALTER COLUMN ai_moves_balance SET DEFAULT 50,
  ALTER COLUMN chat_messages_balance SET NOT NULL,
  ALTER COLUMN chat_messages_balance SET DEFAULT 20;

-- -----------------------------------------------------------------------------
-- 4. Drop old daily columns (data preserved in new balance columns)
-- -----------------------------------------------------------------------------
ALTER TABLE subscriptions
  DROP COLUMN daily_ai_moves_limit,
  DROP COLUMN daily_ai_moves_used,
  DROP COLUMN daily_chat_messages_limit,
  DROP COLUMN daily_chat_messages_used,
  DROP COLUMN last_usage_reset;

-- -----------------------------------------------------------------------------
-- 5. Update RPC: can_use_ai_move - check balance > 0 or unlimited (-1)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_use_ai_move(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT ai_moves_balance INTO v_balance
  FROM subscriptions
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN TRUE; -- Allow if no subscription record (will be created)
  END IF;

  IF v_balance = -1 THEN
    RETURN TRUE; -- Unlimited
  END IF;

  RETURN v_balance > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 6. Update RPC: increment_ai_move_usage - decrement balance (skip unlimited)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_ai_move_usage(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET ai_moves_balance = CASE
    WHEN ai_moves_balance = -1 THEN -1
    ELSE GREATEST(0, ai_moves_balance - 1)
  END
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 7. Update RPC: can_use_chat - check balance > 0 or unlimited (-1)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_use_chat(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT chat_messages_balance INTO v_balance
  FROM subscriptions
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  IF v_balance = -1 THEN
    RETURN TRUE; -- Unlimited
  END IF;

  RETURN v_balance > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 8. Update RPC: increment_chat_usage - decrement balance (skip unlimited)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_chat_usage(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET chat_messages_balance = CASE
    WHEN chat_messages_balance = -1 THEN -1
    ELSE GREATEST(0, chat_messages_balance - 1)
  END
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 9. New RPC: add_to_balance - for subscription renewals and move pack purchases
--    Stacks on top of existing balance. Skips unlimited users.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION add_to_balance(
  p_user_id UUID,
  p_ai_moves INTEGER DEFAULT 0,
  p_chat_messages INTEGER DEFAULT 0
)
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET
    ai_moves_balance = CASE
      WHEN ai_moves_balance = -1 THEN -1
      ELSE ai_moves_balance + p_ai_moves
    END,
    chat_messages_balance = CASE
      WHEN chat_messages_balance = -1 THEN -1
      ELSE chat_messages_balance + p_chat_messages
    END
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 10. New RPC: set_balance - for free tier monthly reset (non-stacking)
--     Sets balance to exact value instead of adding.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_balance(
  p_user_id UUID,
  p_ai_moves INTEGER DEFAULT 0,
  p_chat_messages INTEGER DEFAULT 0
)
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET
    ai_moves_balance = p_ai_moves,
    chat_messages_balance = p_chat_messages
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 11. Drop the old reset function (no longer needed)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS reset_daily_usage();

-- -----------------------------------------------------------------------------
-- 12. Update the auto-create subscription trigger to use new columns
--     New free users start with 50 AI moves and 20 chat messages
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION initialize_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, status, plan_type, ai_moves_balance, chat_messages_balance)
  VALUES (NEW.id, 'active', 'free', 50, 20)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
