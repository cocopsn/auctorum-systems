-- ============================================================
-- S1.1+S1.2+S1.4: Billing columns + fix free→basico
-- ============================================================

-- Add stripe_customer_id to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer 
  ON subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Fix plan names: free → basico
UPDATE subscriptions SET plan = 'basico' WHERE plan = 'free';
UPDATE tenants SET plan = 'basico' WHERE plan = 'free';

-- Update default for new rows
ALTER TABLE subscriptions ALTER COLUMN plan SET DEFAULT 'basico';
