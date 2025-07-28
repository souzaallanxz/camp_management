-- Add tier column to teams table if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'tier') THEN
    ALTER TABLE teams ADD COLUMN tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free', 'premium'));
  END IF;
END $$;

-- Create lemon_squeezy_subscriptions table
CREATE TABLE IF NOT EXISTS lemon_squeezy_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  subscription_id VARCHAR(255) NOT NULL, -- Lemon Squeezy subscription ID
  variant_id VARCHAR(255), -- Lemon Squeezy variant ID
  status VARCHAR(50) DEFAULT 'active', -- active, cancelled, expired, etc.
  event_name VARCHAR(100), -- subscription_created, subscription_cancelled, etc.
  custom_data JSONB, -- Store custom data from webhook
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, subscription_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_lemon_squeezy_team_id ON lemon_squeezy_subscriptions(team_id);
CREATE INDEX IF NOT EXISTS idx_lemon_squeezy_subscription_id ON lemon_squeezy_subscriptions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_lemon_squeezy_status ON lemon_squeezy_subscriptions(status); 