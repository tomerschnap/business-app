ALTER TABLE conversation_state
  ADD CONSTRAINT uq_conv_state_business_ig UNIQUE (business_id, ig_id);
