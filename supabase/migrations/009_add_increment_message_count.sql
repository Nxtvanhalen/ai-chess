-- Atomic message count increment to prevent race conditions
CREATE OR REPLACE FUNCTION increment_message_count(p_conversation_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE conversations
  SET message_count = COALESCE(message_count, 0) + 1,
      updated_at = NOW()
  WHERE id = p_conversation_id;
END;
$$ LANGUAGE plpgsql;
