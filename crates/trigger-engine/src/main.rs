use futures_util::StreamExt;
use shared::BookTickerMessage;
use shared::models::Position;
use rust_decimal::Decimal;
use sqlx::PgPool;
use redis::AsyncCommands;

#[tokio::main]
async fn main() {
    println!("Trigger Engine starting...");

    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1/".to_string());
    let client = redis::Client::open(redis_url.as_str()).unwrap();
    let mut pubsub = client.get_async_pubsub().await.unwrap();
    let pool = shared::db::create_pool().await.expect("Failed to Connect to Db");

    pubsub.subscribe("price:btc").await.expect("Failed to subscribe");
    println!("Subscribed to price:btc channel");

    let mut stream = pubsub.on_message();

    while let Some(msg) = stream.next().await {
        if let Ok(payload) = msg.get_payload::<String>() {
            let parsed: BookTickerMessage = match serde_json::from_str(&payload) {
                Ok(p) => p,
                Err(e) => {
                    eprintln!("Failed to parse message: {}", e);
                    continue;
                }
            };

            let bid_price = match parsed.data.bestbid.parse::<Decimal>() {
                Ok(p) => p,
                Err(_) => continue,
            };
            let ask_price = match parsed.data.bestask.parse::<Decimal>() {
                Ok(p) => p,
                Err(_) => continue,
            };

           
            check_triggers(&pool, bid_price, ask_price).await;
        }
    }
}

async fn check_triggers(pool: &PgPool, bid_price: Decimal, ask_price: Decimal) {
    
    let positions = sqlx::query_as::<_, Position>(
        "SELECT * FROM positions WHERE position_status = 'open'"
    )
    .fetch_all(pool)
    .await;

    let positions = match positions {
        Ok(p) => p,
        Err(e) => {
            eprintln!("Failed to fetch positions: {}", e);
            return;
        }
    };

    for position in positions {
     
        let check_price = if position.direction == "long" {
            bid_price
        } else {
            ask_price
        };

        let mut triggered = false;
        let mut trigger_reason = String::new();

       
        if let Some(liq_price) = position.liquidation_price {
            let liq_triggered = if position.direction == "long" {
                check_price <= liq_price  
            } else {
                check_price >= liq_price  
            };

            if liq_triggered {
                triggered = true;
                trigger_reason = "liquidation".to_string();
                println!(
                    "⚠️ LIQUIDATION: position_id={}, direction={}, entry={}, liq={}, current={}",
                    position.position_id, position.direction, position.entry_price, liq_price, check_price
                );
            }
        }


        if !triggered {
            if let Some(sl_price) = position.stop_loss_price {
                let sl_triggered = if position.direction == "long" {
                    check_price <= sl_price  // LONG: price drops to SL
                } else {
                    check_price >= sl_price  // SHORT: price rises to SL
                };

                if sl_triggered {
                    triggered = true;
                    trigger_reason = "stop_loss".to_string();
                    println!(
                        "SL TRIGGERED: position_id={}, direction={}, entry={}, sl={}, current={}",
                        position.position_id, position.direction, position.entry_price, sl_price, check_price
                    );
                }
            }
        }

    
        if !triggered {
            if let Some(tp_price) = position.profit_price {
                let tp_triggered = if position.direction == "long" {
                    check_price >= tp_price  // LONG: price rises to TP
                } else {
                    check_price <= tp_price  // SHORT: price drops to TP
                };

                if tp_triggered {
                    triggered = true;
                    trigger_reason = "take_profit".to_string();
                    println!(
                        "TP TRIGGERED: position_id={}, direction={}, entry={}, tp={}, current={}",
                        position.position_id, position.direction, position.entry_price, tp_price, check_price
                    );
                }
            }
        }

        
        if triggered {
            close_position(pool, &position, check_price, &trigger_reason).await;
        }
    }
}

async fn close_position(pool: &PgPool, position: &Position, close_price: Decimal, reason: &str) {
  
    let pnl = if position.direction == "long" {
        (close_price - position.entry_price) * position.position_size
    } else {
        (position.entry_price - close_price) * position.position_size
    };

    
    let margin = position.entry_price * position.position_size;
    let credit_amount = margin + pnl;

    println!(
        "CLOSING position_id={}, reason={}, pnl={}, credit={}",
        position.position_id, reason, pnl, credit_amount
    );

    
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            eprintln!("Failed to start transaction: {}", e);
            return;
        }
    };

    
    let update_position = sqlx::query(
        "UPDATE positions SET position_status = 'closed', close_price = $1, close_time = NOW(), profit_realized = $2
         WHERE position_id = $3"
    )
    .bind(close_price)
    .bind(pnl)
    .bind(position.position_id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = update_position {
        eprintln!("Failed to update position: {}", e);
        return;
    }

    
    if let Some(quote_asset_id) = position.quote_asset_id {
        let update_balance = sqlx::query(
            "UPDATE balances SET quantity = quantity + $1 WHERE user_id = $2 AND asset_id = $3"
        )
        .bind(credit_amount)
        .bind(position.user_id)
        .bind(quote_asset_id)
        .execute(&mut *tx)
        .await;

        if let Err(e) = update_balance {
            eprintln!("Failed to credit balance: {}", e);
            return;
        }
        println!("Credited {} to user {} balance", credit_amount, position.user_id);
    } else {
        eprintln!("Warning: No quote_asset_id for position {}, skipping balance credit", position.position_id);
    }

  
    let insert_history = sqlx::query(
        "INSERT INTO trade_history (id, position_id, user_id, asset_id, direction, quantity, entry_price, close_price, realized_pnl, close_reason, opened_at, closed_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())"
    )
    .bind(position.position_id)
    .bind(position.user_id)
    .bind(position.asset_id)
    .bind(&position.direction)
    .bind(position.position_size)
    .bind(position.entry_price)
    .bind(close_price)
    .bind(pnl)
    .bind(reason)
    .bind(position.open_time)
    .execute(&mut *tx)
    .await;

    if let Err(e) = insert_history {
        eprintln!("Failed to insert trade history: {}", e);
        return;
    }

   
    if let Err(e) = tx.commit().await {
        eprintln!("Failed to commit transaction: {}", e);
        return;
    }

    
    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1/".to_string());
    let redis_client = redis::Client::open(redis_url.as_str()).unwrap();
    if let Ok(mut conn) = redis_client.get_multiplexed_async_connection().await {
        let event = serde_json::json!({
            "event_type": "Position Auto-Closed",
            "position_id": position.position_id.to_string(),
            "user_id": position.user_id.to_string(),
            "direction": position.direction,
            "entry_price": position.entry_price.to_string(),
            "close_price": close_price.to_string(),
            "pnl": pnl.to_string(),
            "reason": reason,
        });
        let _ = conn.publish::<_, _, ()>("trade_events", event.to_string()).await;
    }

    println!("Position {} closed successfully via {}", position.position_id, reason);
}
