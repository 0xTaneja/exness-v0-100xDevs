use futures_util::StreamExt;
use rust_decimal::Decimal;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use ed25519_dalek::{SigningKey, Signer};
use base64::Engine;
use base64::engine::general_purpose::STANDARD as BASE64;

#[derive(Debug, Deserialize)]
struct TradeEvent {
    event_type: String,
    #[serde(default)]
    user_id: Option<String>,
    #[serde(default)]
    position_id: Option<String>,
    #[serde(default)]
    asset_id: Option<String>,
    #[serde(default)]
    direction: Option<String>,
    #[serde(default)]
    quantity: Option<String>,
    #[serde(default)]
    price: Option<String>,
    #[serde(default)]
    pnl: Option<String>,
    #[serde(default)]
    close_reason: Option<String>,
    #[serde(default)]
    reason: Option<String>,
}

struct ExposureTracker {
    exposures: HashMap<String, Decimal>,
    hedge_threshold: Decimal,
}

impl ExposureTracker {
    fn new(threshold: Decimal) -> Self {
        Self { exposures: HashMap::new(), hedge_threshold: threshold }
    }

    fn update_exposure(&mut self, asset_id: &str, direction: &str, quantity: Decimal, is_open: bool) {
        let entry = self.exposures.entry(asset_id.to_string()).or_insert(Decimal::ZERO);
        let delta = if direction == "long" {
            if is_open { quantity } else { -quantity }
        } else {
            if is_open { -quantity } else { quantity }
        };
        *entry += delta;
        println!("Exposure updated for {}: {} (delta: {})", asset_id, entry, delta);
    }

    fn get_exposure(&self, asset_id: &str) -> Decimal {
        *self.exposures.get(asset_id).unwrap_or(&Decimal::ZERO)
    }

    fn needs_hedge(&self, asset_id: &str) -> bool {
        self.get_exposure(asset_id).abs() > self.hedge_threshold
    }
}

struct ExchangeClient {
    http: reqwest::Client,
    api_key: String,
    signing_key: Option<SigningKey>,
    base_url: String,
    live_mode: bool,
}

impl ExchangeClient {
    fn new() -> Self {
        let api_key = std::env::var("BACKPACK_API_KEY").unwrap_or_default();
        let api_secret = std::env::var("BACKPACK_API_SECRET").unwrap_or_default();
        let base_url = std::env::var("BACKPACK_API_URL")
            .unwrap_or_else(|_| "https://api.backpack.exchange".to_string());

        let signing_key = if !api_secret.is_empty() {
            match BASE64.decode(&api_secret) {
                Ok(bytes) if bytes.len() == 32 => {
                    let mut seed = [0u8; 32];
                    seed.copy_from_slice(&bytes);
                    Some(SigningKey::from_bytes(&seed))
                }
                Ok(bytes) if bytes.len() == 64 => {
                   
                    let mut seed = [0u8; 32];
                    seed.copy_from_slice(&bytes[..32]);
                    Some(SigningKey::from_bytes(&seed))
                }
                _ => {
                    eprintln!("Warning: BACKPACK_API_SECRET is not valid base64 ED25519 key");
                    None
                }
            }
        } else {
            None
        };

        let live_mode = !api_key.is_empty() && signing_key.is_some();

        if live_mode {
            println!("Exchange client: LIVE MODE (Backpack Exchange - ED25519)");
        } else {
            println!("Exchange client: SIMULATION MODE (set BACKPACK_API_KEY + BACKPACK_API_SECRET for live)");
        }

        Self {
            http: reqwest::Client::new(),
            api_key,
            signing_key,
            base_url,
            live_mode,
        }
    }

    fn sign(&self, message: &str) -> String {
        if let Some(ref key) = self.signing_key {
            let signature = key.sign(message.as_bytes());
            BASE64.encode(signature.to_bytes())
        } else {
            String::new()
        }
    }

    async fn place_order(&self, symbol: &str, side: &str, quantity: Decimal) -> Result<(), String> {
        if !self.live_mode {
            println!("[SIMULATED] {} {} {} on {}", side, quantity, symbol, self.base_url);
            return Ok(());
        }

        let timestamp = chrono::Utc::now().timestamp_millis().to_string();
        let window = "5000";

        // Build instruction string for signing (params sorted alphabetically)
        let instruction = format!(
            "instruction=orderExecute&orderType=Market&quantity={}&side={}&symbol={}&timestamp={}&window={}",
            quantity, side, symbol, timestamp, window
        );
        let signature = self.sign(&instruction);

        let res = self.http
            .post(format!("{}/api/v1/orders", self.base_url))
            .header("X-API-Key", &self.api_key)
            .header("X-Timestamp", &timestamp)
            .header("X-Window", window)
            .header("X-Signature", &signature)
            .json(&serde_json::json!({
                "symbol": symbol,
                "side": side,
                "orderType": "Market",
                "quantity": quantity.to_string()
            }))
            .send()
            .await
            .map_err(|e| format!("HTTP error: {}", e))?;

        if res.status().is_success() {
            let body = res.text().await.unwrap_or_default();
            println!("Hedge order placed: {}", body);
            Ok(())
        } else {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            Err(format!("Exchange API error {}: {}", status, body))
        }
    }
}

#[tokio::main]
async fn main() {
    println!("Hedging Worker starting...");

    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1/".to_string());
    let client = redis::Client::open(redis_url.as_str()).unwrap();
    let mut pubsub = client.get_async_pubsub().await.unwrap();
    pubsub.subscribe("trade_events").await.expect("Failed to subscribe to trade_events");
    println!("Subscribed to trade_events channel");

    let tracker = Arc::new(Mutex::new(ExposureTracker::new(Decimal::from(10))));
    let exchange = Arc::new(ExchangeClient::new());
    let mut stream = pubsub.on_message();

    while let Some(msg) = stream.next().await {
        if let Ok(payload) = msg.get_payload::<String>() {
            let event: TradeEvent = match serde_json::from_str(&payload) {
                Ok(e) => e,
                Err(e) => { eprintln!("Failed to parse event: {}", e); continue; }
            };
            process_event(&tracker, &exchange, &event).await;
        }
    }
}

async fn process_event(tracker: &Arc<Mutex<ExposureTracker>>, exchange: &Arc<ExchangeClient>, event: &TradeEvent) {
    let asset_id = match &event.asset_id { Some(id) => id.clone(), None => return };
    let direction = match &event.direction { Some(d) => d.clone(), None => return };
    let quantity: Decimal = match &event.quantity {
        Some(q) => q.parse().unwrap_or(Decimal::ZERO),
        None => return,
    };

    let mut tracker = tracker.lock().await;

    match event.event_type.as_str() {
        "Position Opened" => {
            println!("\n--- Position Opened ---");
            tracker.update_exposure(&asset_id, &direction, quantity, true);
        }
        "Position Closed" | "Position Auto-Closed" => {
            let reason = event.close_reason.as_deref().or(event.reason.as_deref()).unwrap_or("manual");
            println!("\n--- Position Closed ({}) ---", reason);
            tracker.update_exposure(&asset_id, &direction, quantity, false);
        }
        _ => return,
    }

    let net_exposure = tracker.get_exposure(&asset_id);
    println!("Net exposure for {}: {}", asset_id, net_exposure);

    if tracker.needs_hedge(&asset_id) {
        let hedge_side = if net_exposure > Decimal::ZERO { "Ask" } else { "Bid" };
        let hedge_size = net_exposure.abs();

        println!("Hedging: {} {} BTC_USDC_PERP", hedge_side, hedge_size);

        match exchange.place_order("BTC_USDC_PERP", hedge_side, hedge_size).await {
            Ok(_) => println!("Hedge executed successfully"),
            Err(e) => eprintln!("Hedge FAILED: {}", e),
        }
    } else {
        println!("Exposure within threshold - no hedge needed");
    }
}
