

CREATE TABLE candles (
    candles_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL,
    open_price DECIMAL NOT NULL,
    close_price DECIMAL NOT NULL,
    high_price DECIMAL NOT NULL,
    low_price DECIMAL NOT NULL,
    volume DECIMAL NOT NULL,
    trade_time TIMESTAMP,
    trade_duration VARCHAR(10) NOT NULL,
    asset_name VARCHAR(255) NOT NULL,
    UNIQUE(asset_id,trade_duration,trade_time)

);

CREATE INDEX candles_idx on candles (asset_id,trade_duration,trade_time);
