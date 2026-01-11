use chrono::Utc;
use futures_util::StreamExt;
use redis::Client;
use rust_decimal::Decimal;
use shared::BookTickerMessage;
use sqlx::PgPool;
use tokio::time::{interval, Duration};

pub struct CandleData {
    pub open_price: Option<rust_decimal::Decimal>,
    pub close_price: Option<rust_decimal::Decimal>,
    pub high_price: Option<rust_decimal::Decimal>,
    pub low_price: Option<rust_decimal::Decimal>,
    pub volume: Option<rust_decimal::Decimal>,
}

impl CandleData {
    fn update(&mut self, price: Decimal) {
        match self.open_price {
            None => {
                self.open_price = Some(price);
                self.high_price = Some(price);
                self.low_price = Some(price);
                self.close_price = Some(price);
            }
            Some(_) => {
                if price > self.high_price.unwrap() {
                    self.high_price = Some(price);
                }
                if price < self.low_price.unwrap() {
                    self.low_price = Some(price);
                }
                self.close_price = Some(price);
            }
        }
    }

    fn is_empty(&self) -> bool {
        self.open_price.is_none()
    }

    fn reset(&mut self) {
        self.open_price = None;
        self.close_price = None;
        self.high_price = None;
        self.low_price = None;
        self.volume = None;
    }
}

async fn save_candle(pool: &PgPool, candle: &CandleData, asset_id: &str) {
    let trade_time = Utc::now().naive_utc();

    let result = sqlx::query(
        "INSERT INTO candles (asset_id, open_price, close_price, high_price, low_price, volume, trade_time, trade_duration, asset_name)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9)"
    )
    .bind(asset_id)
    .bind(candle.open_price)
    .bind(candle.close_price)
    .bind(candle.high_price)
    .bind(candle.low_price)
    .bind(candle.volume.unwrap_or(Decimal::ZERO))
    .bind(trade_time)
    .bind("1m")
    .bind("BTC")
    .execute(pool)
    .await;

    match result {
        Ok(_) => println!("Candle saved to database"),
        Err(e) => eprintln!("Failed to save candle: {}", e),
    }
}

#[tokio::main]
async fn main() {
    
    let pool = shared::db::create_pool()
        .await
        .expect("Failed to connect to database");
    println!("Connected to PostgreSQL");

    
    let client: Client = redis::Client::open("redis://127.0.0.1/").unwrap();
    let mut pubsub = client.get_async_pubsub().await.unwrap();
    pubsub.subscribe("price:btc").await.unwrap();
    println!("Subscribed to Redis price:btc");

    let mut stream = pubsub.on_message();

    let mut candle = CandleData {
        open_price: None,
        close_price: None,
        high_price: None,
        low_price: None,
        volume: None,
    };

    
    let btc_asset_id = "9191415d-caf6-41db-a556-b660c2b8d398";

    let mut timer = interval(Duration::from_secs(60));

    loop {
        tokio::select! {
            Some(msg) = stream.next() => {
                if let Ok(payload) = msg.get_payload::<String>() {
                    let ticker: BookTickerMessage = serde_json::from_str(&payload).unwrap();
                    let price: Decimal = ticker.data.bestbid.parse().unwrap();
                    candle.update(price);
                    println!("Price: {} | O:{:?} H:{:?} L:{:?} C:{:?}",
                        price, candle.open_price, candle.high_price, candle.low_price, candle.close_price);
                }
            }
            _ = timer.tick() => {
                println!("=== CANDLE COMPLETE ===");

                if !candle.is_empty() {
                    println!("Open: {:?}, High: {:?}, Low: {:?}, Close: {:?}",
                        candle.open_price, candle.high_price, candle.low_price, candle.close_price);

                    
                    save_candle(&pool, &candle, btc_asset_id).await;

                    
                    candle.reset();
                } else {
                    println!("No ticks received - skipping empty candle");
                }
            }
        }
    }
}
