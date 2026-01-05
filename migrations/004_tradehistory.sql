

CREATE TABLE trade_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID,
    user_id UUID,
    asset_id UUID,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('long','short')),
    quantity DECIMAL,
    entry_price DECIMAL,
    close_price DECIMAL,
    realized_pnl DECIMAL,
    close_reason VARCHAR,
    opened_at TIMESTAMP,
    closed_at TIMESTAMP
);