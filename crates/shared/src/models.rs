use serde::Serialize;
use sqlx::FromRow;




#[derive(sqlx::FromRow)]
pub struct User { 
   pub id:sqlx::types::Uuid,
   pub email:String,
   pub password_hash: String,
   pub created_at: Option<chrono::NaiveDateTime>
}

#[derive(sqlx::FromRow)]
struct Asset {  
 id: sqlx::types::Uuid,
 symbol: String,
 asset_name: String,
 created_at: Option<chrono::NaiveDateTime>
}

#[derive(sqlx::FromRow,Serialize)]
pub struct Balance {
    pub id: sqlx::types::Uuid,
    pub user_id: sqlx::types::Uuid,
    pub asset_id: sqlx::types::Uuid,
    pub quantity: Option<rust_decimal::Decimal>,
    pub updated_at: Option<chrono::NaiveDateTime>
}

#[derive(sqlx::FromRow, Serialize)]
pub struct Order {
    pub id: sqlx::types::Uuid,
    pub user_id: sqlx::types::Uuid,
    pub asset_id: sqlx::types::Uuid,
    pub side: String,
    pub quantity: Option<rust_decimal::Decimal>,
    pub price: rust_decimal::Decimal,
    pub order_status: String,
    pub created_at: Option<chrono::NaiveDateTime>,
    pub idempotency_key: Option<String>,
}

#[derive(sqlx::FromRow, Serialize)]
pub struct Candle {
    pub candles_id: sqlx::types::Uuid,
    pub asset_id: sqlx::types::Uuid,
    pub open_price: Option<rust_decimal::Decimal>,
    pub close_price: Option<rust_decimal::Decimal>,
    pub high_price: Option<rust_decimal::Decimal>,
    pub low_price: Option<rust_decimal::Decimal>,
    pub volume: Option<rust_decimal::Decimal>,
    pub trade_time: Option<chrono::NaiveDateTime>,
    pub trade_duration: String,
    pub asset_name: String,
}


#[derive(sqlx::FromRow,Serialize)]
pub struct Position {
  pub position_id : sqlx::types::Uuid,
  pub user_id : sqlx::types::Uuid,
  pub asset_id: sqlx::types::Uuid,
  pub direction: String,
  pub position_size: rust_decimal::Decimal,
  pub entry_price: rust_decimal::Decimal,
  pub stop_loss_price: Option<rust_decimal::Decimal>,
  pub open_time: Option<chrono::NaiveDateTime>,
  pub profit_price: Option<rust_decimal::Decimal>,
  pub close_time: Option<chrono::NaiveDateTime>,
  pub close_price: Option<rust_decimal::Decimal>,
  pub profit_realized: Option<rust_decimal::Decimal>,
  pub position_status: String,
  pub quote_asset_id: Option<sqlx::types::Uuid>,
  pub idempotency_key: Option<String>,
  pub leverage: Option<rust_decimal::Decimal>,
  pub liquidation_price: Option<rust_decimal::Decimal>,
}