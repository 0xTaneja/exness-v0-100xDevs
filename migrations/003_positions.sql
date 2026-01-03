

CREATE TABLE positions (
   position_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id UUID NOT NULL,
   asset_id UUID NOT NULL,
   direction VARCHAR(10) NOT NULL CHECK (direction IN ('long','short')),
   position_size DECIMAL NOT NULL,
   entry_price DECIMAL NOT NULL,
   stop_loss_price DECIMAL,
   profit_price DECIMAL,
   open_time TIMESTAMP DEFAULT NOW(),
   close_time TIMESTAMP,
   close_price DECIMAL,
   profit_realized DECIMAL,
   position_status VARCHAR(10) NOT NULL CHECK (position_status IN ('open','closed')),
   FOREIGN KEY(user_id) REFERENCES users(id),
   FOREIGN KEY (asset_id) REFERENCES assets(id)

);

CREATE INDEX position_idx on positions (user_id);
CREATE INDEX position_idx1 on positions (position_status);
CREATE INDEX position_idx2 on positions (user_id,position_status);
CREATE INDEX position_idx3 on positions (stop_loss_price,position_status);

