use tokio_tungstenite::connect_async;
use futures_util::{StreamExt, SinkExt};
use tungstenite::{Message, Utf8Bytes};
use redis::AsyncCommands;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = "wss://ws.backpack.exchange/";

    let subscription_json = serde_json::json!({
        "method": "SUBSCRIBE",
        "params": ["bookTicker.BTC_USDC_PERP", "depth.BTC_USDC_PERP"]
    });

    let (ws_stream, _) = connect_async(url).await?;
    let (mut write, mut read) = ws_stream.split();
    let redis_client = redis::Client::open("redis://127.0.0.1/")?;
    let mut redis_conn = redis_client.get_multiplexed_async_connection().await?;

    let txt = serde_json::to_string(&subscription_json).unwrap();
    write.send(Message::Text(Utf8Bytes::from(txt))).await?;

    println!("Price Poller started - subscribed to bookTicker + depth");

    while let Some(msg) = read.next().await {
        if let Ok(Message::Text(text)) = msg {
            let parsed: serde_json::Value = match serde_json::from_str(&text) {
                Ok(v) => v,
                Err(_) => continue,
            };

            let stream = parsed.get("stream").and_then(|s| s.as_str()).unwrap_or("");

            if stream.starts_with("bookTicker") {
                if let Some(data) = parsed.get("data") {
                    redis_conn.publish::<_, _, ()>("price:btc", &data.to_string()).await?;
                    let bid = data.get("b").and_then(|v| v.as_str()).unwrap_or("?");
                    let ask = data.get("a").and_then(|v| v.as_str()).unwrap_or("?");
                    println!("Ticker: bid={} ask={}", bid, ask);
                }
            } else if stream.starts_with("depth") {
                if let Some(data) = parsed.get("data") {
                    redis_conn.publish::<_, _, ()>("orderbook:btc", &data.to_string()).await?;
                    let bid_count = data.get("b").and_then(|v| v.as_array()).map(|a| a.len()).unwrap_or(0);
                    let ask_count = data.get("a").and_then(|v| v.as_array()).map(|a| a.len()).unwrap_or(0);
                    println!("Depth: {} bids, {} asks", bid_count, ask_count);
                }
            }
        }
    }

    Ok(())
}
