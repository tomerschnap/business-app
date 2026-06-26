CREATE TABLE conversation_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  ig_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'awaiting_date',
  context JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversation_state_ig_id ON conversation_state(ig_id);
