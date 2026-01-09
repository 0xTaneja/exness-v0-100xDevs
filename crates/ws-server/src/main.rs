use axum::extract::{State, WebSocketUpgrade};
use axum::response::IntoResponse;
use futures_util::StreamExt;
use tokio::sync::broadcast;
use axum::Router;
use axum::routing::any;
use axum::extract::ws::{Message, WebSocket};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let (tx, _rx) = broadcast::channel::<String>(100);
    let redis_tx = tx.clone();

    tokio::spawn(async move {
        let client = redis::Client::open("redis://127.0.0.1/").unwrap();
        let mut pubsub = client.get_async_pubsub().await.unwrap();
        pubsub.subscribe("price:btc").await.unwrap();
        pubsub.subscribe("orderbook:btc").await.unwrap();
        println!("Subscribed to price:btc and orderbook:btc");

        let mut stream = pubsub.on_message();
        while let Some(msg) = stream.next().await {
            let channel: String = msg.get_channel().unwrap_or_default();
            if let Ok(payload) = msg.get_payload::<String>() {
                let msg_type = if channel == "price:btc" { "ticker" } else { "orderbook" };
                let data: serde_json::Value = serde_json::from_str(&payload).unwrap_or(serde_json::Value::Null);
                let wrapped = serde_json::json!({ "type": msg_type, "data": data });
                let _ = redis_tx.send(wrapped.to_string());
            }
        }
    });

    let app = Router::new().route("/ws", any(ws_handler)).with_state(tx);
    println!("WebSocket server running on ws://127.0.0.1:3003/ws");
    let listener = tokio::net::TcpListener::bind("127.0.0.1:3003").await.unwrap();
    axum::serve(listener, app).await.unwrap();

    Ok(())
}

async fn ws_handler(ws: WebSocketUpgrade, State(tx): State<broadcast::Sender<String>>) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, tx))
}

async fn handle_socket(mut socket: WebSocket, tx: broadcast::Sender<String>) {
    let mut rx = tx.subscribe();
    while let Ok(msg) = rx.recv().await {
        if socket.send(Message::text(msg)).await.is_err() {
            break;
        }
    }
}
