use futures_util::StreamExt;
use serde::Deserialize;
use sqlx::PgPool;

#[derive(Debug, Deserialize)]
struct TradeEvent {
    event_type: String,
    user_id: String,
    #[serde(default)]
    position_id: Option<String>,
    #[serde(default)]
    order_id: Option<String>,
    #[serde(default)]
    asset_id: Option<String>,
    #[serde(default)]
    direction: Option<String>,
    #[serde(default)]
    quantity: Option<String>,
    #[serde(default)]
    price: Option<String>,
    #[serde(default)]
    entry_price: Option<String>,
    #[serde(default)]
    close_price: Option<String>,
    #[serde(default)]
    pnl: Option<String>,
    #[serde(default)]
    close_reason: Option<String>,
    #[serde(default)]
    reason: Option<String>,
}

#[tokio::main]
async fn main() {
    let resend_api_key = std::env::var("RESEND_API_KEY").unwrap_or_default();
    let from_email = std::env::var("FROM_EMAIL").unwrap_or_else(|_| "XTerminal <onboarding@resend.dev>".to_string());

    if resend_api_key.is_empty() {
        println!("Email Worker starting (MOCK MODE - set RESEND_API_KEY for real emails)");
    } else {
        println!("Email Worker starting (LIVE MODE via Resend)");
    }

    let pool = shared::db::create_pool().await.expect("Failed to connect to DB");
    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1/".to_string());
    let client = redis::Client::open(redis_url.as_str()).unwrap();
    let mut pubsub = client.get_async_pubsub().await.unwrap();
    pubsub.subscribe("trade_events").await.expect("Failed to subscribe to trade_events");
    println!("Subscribed to trade_events channel");

    let http_client = reqwest::Client::new();
    let mut stream = pubsub.on_message();

    while let Some(msg) = stream.next().await {
        if let Ok(payload) = msg.get_payload::<String>() {
            let event: TradeEvent = match serde_json::from_str(&payload) {
                Ok(e) => e,
                Err(e) => { eprintln!("Failed to parse event: {}", e); continue; }
            };

            let user_email = get_user_email(&pool, &event.user_id).await;
            let (subject, body) = build_email(&event);

            if resend_api_key.is_empty() {
                println!("\n MOCK EMAIL ");
                println!("To: {}", user_email.as_deref().unwrap_or("unknown"));
                println!("Subject: {}", subject);
                println!("Body: {}", body);
                println!("\n");
            } else if let Some(email) = &user_email {
                match send_email(&http_client, &resend_api_key, &from_email, email, &subject, &body).await {
                    Ok(_) => println!("Email sent to {} - {}", email, subject),
                    Err(e) => eprintln!("Failed to send email to {}: {}", email, e),
                }
            } else {
                eprintln!("No email found for user_id: {}", event.user_id);
            }
        }
    }
}

async fn get_user_email(pool: &PgPool, user_id: &str) -> Option<String> {
    let result = sqlx::query_as::<_, (String,)>("SELECT email FROM users WHERE id = $1::uuid")
        .bind(user_id)
        .fetch_optional(pool)
        .await;

    match result {
        Ok(Some((email,))) => Some(email),
        _ => None,
    }
}

fn build_email(event: &TradeEvent) -> (String, String) {
    let reason = event.close_reason.as_deref().or(event.reason.as_deref());
    match event.event_type.as_str() {
        "Position Opened" => {
            let subject = "Position Opened - XTerminal".to_string();
            let body = format!(
                "<h2>Position Opened</h2>\
                <p>Your <strong>{}</strong> position has been opened.</p>\
                <table style='border-collapse:collapse'>\
                <tr><td style='padding:4px 12px;color:#666'>Order ID</td><td style='padding:4px 12px'>{}</td></tr>\
                <tr><td style='padding:4px 12px;color:#666'>Quantity</td><td style='padding:4px 12px'>{}</td></tr>\
                <tr><td style='padding:4px 12px;color:#666'>Entry Price</td><td style='padding:4px 12px'>${}</td></tr>\
                </table>\
                <p style='color:#666;font-size:12px;margin-top:20px'>XTerminal Trading Platform</p>",
                event.direction.as_deref().unwrap_or("N/A"),
                event.order_id.as_deref().unwrap_or("N/A"),
                event.quantity.as_deref().unwrap_or("N/A"),
                event.price.as_deref().unwrap_or("N/A"),
            );
            (subject, body)
        }
        "Position Closed" => {
            let pnl = event.pnl.as_deref().unwrap_or("0");
            let pnl_color = if pnl.starts_with('-') { "#ef4444" } else { "#22c55e" };
            let subject = format!("Position Closed (PnL: ${}) - XTerminal", pnl);
            let body = format!(
                "<h2>Position Closed</h2>\
                <p>Your <strong>{}</strong> position has been closed.</p>\
                <table style='border-collapse:collapse'>\
                <tr><td style='padding:4px 12px;color:#666'>Entry Price</td><td style='padding:4px 12px'>${}</td></tr>\
                <tr><td style='padding:4px 12px;color:#666'>Close Price</td><td style='padding:4px 12px'>${}</td></tr>\
                <tr><td style='padding:4px 12px;color:#666'>Realized PnL</td><td style='padding:4px 12px;color:{};font-weight:bold'>${}</td></tr>\
                <tr><td style='padding:4px 12px;color:#666'>Reason</td><td style='padding:4px 12px'>{}</td></tr>\
                </table>\
                <p style='color:#666;font-size:12px;margin-top:20px'>XTerminal Trading Platform</p>",
                event.direction.as_deref().unwrap_or("N/A"),
                event.entry_price.as_deref().unwrap_or("N/A"),
                event.close_price.as_deref().unwrap_or("N/A"),
                pnl_color, pnl,
                reason.unwrap_or("manual"),
            );
            (subject, body)
        }
        "Position Auto-Closed" => {
            let pnl = event.pnl.as_deref().unwrap_or("0");
            let trigger = reason.unwrap_or("triggered");
            let is_liquidation = trigger == "liquidation";
            let subject = if is_liquidation {
                format!("LIQUIDATION ALERT - Position Liquidated - XTerminal")
            } else {
                format!("Position Auto-Closed ({}) - XTerminal", trigger)
            };
            let body = format!(
                "<h2 style='color:{}'>{}</h2>\
                <p>Your <strong>{}</strong> position was automatically closed.</p>\
                <table style='border-collapse:collapse'>\
                <tr><td style='padding:4px 12px;color:#666'>Trigger</td><td style='padding:4px 12px;font-weight:bold'>{}</td></tr>\
                <tr><td style='padding:4px 12px;color:#666'>Entry Price</td><td style='padding:4px 12px'>${}</td></tr>\
                <tr><td style='padding:4px 12px;color:#666'>Close Price</td><td style='padding:4px 12px'>${}</td></tr>\
                <tr><td style='padding:4px 12px;color:#666'>Realized PnL</td><td style='padding:4px 12px'>${}</td></tr>\
                </table>\
                {}
                <p style='color:#666;font-size:12px;margin-top:20px'>XTerminal Trading Platform</p>",
                if is_liquidation { "#ef4444" } else { "#f0b90b" },
                if is_liquidation { "Position Liquidated" } else { "Position Auto-Closed" },
                event.direction.as_deref().unwrap_or("N/A"),
                trigger,
                event.entry_price.as_deref().unwrap_or("N/A"),
                event.close_price.as_deref().unwrap_or("N/A"),
                pnl,
                if is_liquidation { "<p style='color:#ef4444;font-weight:bold'>Your position was liquidated due to insufficient margin.</p>" } else { "" },
            );
            (subject, body)
        }
        _ => {
            let subject = "Trade Notification - XTerminal".to_string();
            let body = format!("<p>Trade event: {}</p>", event.event_type);
            (subject, body)
        }
    }
}

async fn send_email(
    client: &reqwest::Client,
    api_key: &str,
    from: &str,
    to: &str,
    subject: &str,
    html_body: &str,
) -> Result<(), String> {
    let res = client
        .post("https://api.resend.com/emails")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&serde_json::json!({
            "from": from,
            "to": [to],
            "subject": subject,
            "html": html_body
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if res.status().is_success() {
        Ok(())
    } else {
        let body = res.text().await.unwrap_or_default();
        Err(format!("Resend API error: {}", body))
    }
}
