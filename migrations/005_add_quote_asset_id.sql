-- Add quote_asset_id to positions table for balance crediting on close
ALTER TABLE positions ADD COLUMN quote_asset_id UUID REFERENCES assets(id);

-- Add idempotency_key for retry safety
ALTER TABLE orders ADD COLUMN idempotency_key VARCHAR(255) UNIQUE;
ALTER TABLE positions ADD COLUMN idempotency_key VARCHAR(255) UNIQUE;

-- Add margin_ratio tracking for liquidation
ALTER TABLE positions ADD COLUMN leverage DECIMAL DEFAULT 1;
ALTER TABLE positions ADD COLUMN liquidation_price DECIMAL;

-- Index for faster liquidation checks
CREATE INDEX positions_liquidation_idx ON positions (position_status, liquidation_price) WHERE position_status = 'open';
