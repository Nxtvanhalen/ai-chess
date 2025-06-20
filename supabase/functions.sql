-- Helper function to increment message count
CREATE OR REPLACE FUNCTION increment_message_count(conversation_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE conversations 
  SET message_count = message_count + 1,
      updated_at = NOW()
  WHERE id = conversation_id;
END;
$$ LANGUAGE plpgsql;