use std::str::FromStr;

use axum::{Json, Router};
use axum::extract::State;
use axum::routing::{get, post};
use axum::extract::Query;
use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum::http::StatusCode;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use shared::models::{Position, User, Balance, Candle, Order};
use redis::{AsyncCommands, Client};
use tower_http::cors::{CorsLayer, Any};
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};
use chrono::Utc;



fn jwt_secret() -> String {
    std::env::var("JWT_SECRET").unwrap_or_else(|_| "xterminal-dev-secret-change-in-production".to_string())
}

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,
    email: String,
    exp: usize,
    iat: usize,
}

fn generate_token(user_id: &str, email: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let now = Utc::now().timestamp() as usize;
    let claims = Claims {
        sub: user_id.to_string(),
        email: email.to_string(),
        exp: now + 7 * 24 * 60 * 60,
        iat: now,
    };
    let secret = jwt_secret();
    encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_bytes()))
}



struct AuthUser {
    user_id: String,
    #[allow(dead_code)]
    email: String,
}

impl<S: Send + Sync> FromRequestParts<S> for AuthUser {
    type Rejection = (StatusCode, Json<serde_json::Value>);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let auth_header = parts.headers
            .get("authorization")
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({"success": false, "message": "Missing authorization header"}))
            ))?;

        let token = auth_header.strip_prefix("Bearer ")
            .ok_or_else(|| (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({"success": false, "message": "Invalid authorization format"}))
            ))?;

        let secret = jwt_secret();
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(secret.as_bytes()),
            &Validation::default(),
        ).map_err(|_| (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"success": false, "message": "Invalid or expired token"}))
        ))?;

        Ok(AuthUser {
            user_id: token_data.claims.sub,
            email: token_data.claims.email,
        })
    }
}



#[derive(Deserialize)]
struct SignupRequest {
    email: String,
    password: String,
}

#[derive(Deserialize)]
struct SignInRequest {
    email: String,
    password: String,
}

#[derive(Serialize)]
struct AuthResponse {
    success: bool,
    user_id: Option<String>,
    token: Option<String>,
    message: String,
}

const DEMO_BALANCE: &str = "10000";
const USDT_ASSET_ID: &str = "00000000-0000-0000-0000-000000000002";



async fn signup_handler(State(state): State<AppState>, Json(payload): Json<SignupRequest>) -> Json<AuthResponse> {
    let user_email = payload.email;
    let user_passwordhash = bcrypt::hash(payload.password, bcrypt::DEFAULT_COST).expect("Failed to Hash Password");

    let result = sqlx::query_as::<_, (sqlx::types::Uuid,)>(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id"
    )
    .bind(&user_email)
    .bind(&user_passwordhash)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok((user_id,)) => {
            let _ = sqlx::query(
                "INSERT INTO balances (user_id, asset_id, quantity, updated_at) VALUES ($1, $2::uuid, $3::numeric, NOW())"
            )
            .bind(user_id)
            .bind(USDT_ASSET_ID)
            .bind(DEMO_BALANCE)
            .execute(&state.pool)
            .await;

            let token = generate_token(&user_id.to_string(), &user_email).ok();

            Json(AuthResponse {
                success: true,
                user_id: Some(user_id.to_string()),
                token,
                message: "Account created with $10,000 demo balance".to_string(),
            })
        },
        Err(e) => {
            let msg = if e.to_string().contains("duplicate key") {
                "User already exists".to_string()
            } else {
                format!("Error: {}", e)
            };
            Json(AuthResponse { success: false, user_id: None, token: None, message: msg })
        }
    }
}

async fn signin_handler(State(state): State<AppState>, Json(payload): Json<SignInRequest>) -> Json<AuthResponse> {
    let result = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE email = $1"
    )
    .bind(&payload.email)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(user)) => {
            let valid = bcrypt::verify(&payload.password, &user.password_hash).unwrap_or(false);
            if !valid {
                return Json(AuthResponse {
                    success: false, user_id: None, token: None,
                    message: "Invalid password".to_string(),
                });
            }
            let token = generate_token(&user.id.to_string(), &user.email).ok();
            Json(AuthResponse {
                success: true,
                user_id: Some(user.id.to_string()),
                token,
                message: "Signed in successfully".to_string(),
            })
        }
        Ok(None) => Json(AuthResponse {
            success: false, user_id: None, token: None,
            message: "User not found".to_string(),
        }),
        Err(e) => Json(AuthResponse {
            success: false, user_id: None, token: None,
            message: format!("Database error: {}", e),
        }),
    }
}



#[derive(Serialize)]
struct BalanceResponse { balances: Vec<Balance> }

async fn balance_handler(auth: AuthUser, State(state): State<AppState>) -> Json<BalanceResponse> {
    let result = sqlx::query_as::<_, Balance>("SELECT * FROM balances WHERE user_id = $1::uuid")
        .bind(&auth.user_id).fetch_all(&state.pool).await;
    Json(BalanceResponse { balances: result.unwrap_or_default() })
}

#[derive(Serialize)]
struct PositionResponse { positions: Vec<Position> }

#[derive(Deserialize)]
struct PositionQuery { position_status: String }

async fn positions_handler(auth: AuthUser, Query(params): Query<PositionQuery>, State(state): State<AppState>) -> Json<PositionResponse> {
    let result = sqlx::query_as::<_, Position>(
        "SELECT * FROM positions WHERE user_id = $1::uuid AND position_status = $2"
    ).bind(&auth.user_id).bind(&params.position_status).fetch_all(&state.pool).await;
    Json(PositionResponse { positions: result.unwrap_or_default() })
}

#[derive(Deserialize)]
struct OpenOrderRequest {
    asset_id: String,
    quantity: String,
    price: String,
    direction: String,
    stop_loss: Option<Decimal>,
    take_profit: Option<Decimal>,
    quote_asset_id: String,
    idempotency_key: Option<String>,
}

#[derive(Serialize)]
struct OpenOrderResponse { success: bool, order_id: Option<String>, message: String }

#[derive(Serialize)]
struct TradeEvent {
    event_type: String,
    user_id: String,
    order_id: sqlx::types::Uuid,
    asset_id: String,
    direction: String,
    quantity: Decimal,
    price: Decimal,
}

async fn open_order_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(payload): Json<OpenOrderRequest>,
) -> Json<OpenOrderResponse> {
    if let Some(ref idem_key) = payload.idempotency_key {
        let existing = sqlx::query_as::<_, (sqlx::types::Uuid,)>("SELECT id FROM orders WHERE idempotency_key = $1")
            .bind(idem_key).fetch_optional(&state.pool).await;
        if let Ok(Some((existing_id,))) = existing {
            return Json(OpenOrderResponse { success: true, order_id: Some(existing_id.to_string()), message: "Order already exists (idempotent)".to_string() });
        }
    }

    let quantity: Decimal = payload.quantity.parse().unwrap_or(Decimal::ZERO);
    let price: Decimal = payload.price.parse().unwrap_or(Decimal::ZERO);
    let required_margin = price * quantity;

    match sqlx::query_as::<_, Balance>("SELECT * FROM balances WHERE user_id = $1::uuid AND asset_id = $2::uuid")
        .bind(&auth.user_id).bind(&payload.quote_asset_id).fetch_optional(&state.pool).await
    {
        Ok(Some(balance)) => {
            if balance.quantity.unwrap_or(Decimal::ZERO) < required_margin {
                return Json(OpenOrderResponse { success: false, order_id: None, message: "Insufficient Balance".to_string() });
            }
        },
        Ok(None) => return Json(OpenOrderResponse { success: false, order_id: None, message: "No balance found for quote asset".to_string() }),
        Err(e) => return Json(OpenOrderResponse { success: false, order_id: None, message: format!("Database error: {}", e) }),
    }

    let mut tx = match state.pool.begin().await {
        Ok(tx) => tx,
        Err(e) => return Json(OpenOrderResponse { success: false, order_id: None, message: format!("Transaction error: {}", e) }),
    };

    let order_id = match sqlx::query_as::<_, (sqlx::types::Uuid,)>(
        "INSERT INTO orders (user_id, asset_id, side, quantity, price, order_status, created_at, idempotency_key) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, NOW(), $7) RETURNING id"
    ).bind(&auth.user_id).bind(&payload.asset_id).bind(&payload.direction).bind(quantity).bind(price).bind("open").bind(&payload.idempotency_key)
    .fetch_one(&mut *tx).await {
        Ok((id,)) => id,
        Err(e) => return Json(OpenOrderResponse { success: false, order_id: None, message: format!("Order error: {}", e) }),
    };

    let leverage = Decimal::from(10);
    let liquidation_price = if payload.direction == "long" {
        price * (Decimal::ONE - (Decimal::ONE / leverage))
    } else {
        price * (Decimal::ONE + (Decimal::ONE / leverage))
    };

    if let Err(e) = sqlx::query_as::<_, (sqlx::types::Uuid,)>(
        "INSERT INTO positions (user_id, asset_id, direction, position_size, entry_price, stop_loss_price, profit_price, open_time, position_status, quote_asset_id, leverage, liquidation_price) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, NOW(), $8, $9::uuid, $10, $11) RETURNING position_id"
    ).bind(&auth.user_id).bind(&payload.asset_id).bind(&payload.direction).bind(quantity).bind(price)
    .bind(payload.stop_loss).bind(payload.take_profit).bind("open").bind(&payload.quote_asset_id).bind(leverage).bind(liquidation_price)
    .fetch_one(&mut *tx).await {
        return Json(OpenOrderResponse { success: false, order_id: None, message: format!("Position error: {}", e) });
    }

    if let Err(e) = sqlx::query("UPDATE balances SET quantity = quantity - $1 WHERE user_id = $2::uuid AND asset_id = $3::uuid")
        .bind(required_margin).bind(&auth.user_id).bind(&payload.quote_asset_id).execute(&mut *tx).await {
        return Json(OpenOrderResponse { success: false, order_id: None, message: format!("Balance error: {}", e) });
    }

    if let Err(e) = tx.commit().await {
        return Json(OpenOrderResponse { success: false, order_id: None, message: format!("Commit error: {}", e) });
    }

    if let Ok(mut conn) = state.redis.get_multiplexed_async_connection().await {
        let evs = TradeEvent {
            event_type: "Position Opened".to_string(),
            user_id: auth.user_id,
            order_id,
            asset_id: payload.asset_id,
            direction: payload.direction,
            quantity: Decimal::from_str(&payload.quantity).unwrap_or(Decimal::ZERO),
            price: Decimal::from_str(&payload.price).unwrap_or(Decimal::ZERO),
        };
        let _ = conn.publish::<_, _, ()>("trade_events", serde_json::to_string(&evs).unwrap_or_default()).await;
    }

    Json(OpenOrderResponse { success: true, order_id: Some(order_id.to_string()), message: "Order and position created successfully".to_string() })
}

#[derive(Serialize)]
struct OrdersResponse { orders: Vec<Order> }

async fn orders_handler(auth: AuthUser, State(state): State<AppState>) -> Json<OrdersResponse> {
    let result = sqlx::query_as::<_, Order>("SELECT * FROM orders WHERE user_id = $1::uuid ORDER BY created_at DESC")
        .bind(&auth.user_id).fetch_all(&state.pool).await;
    Json(OrdersResponse { orders: result.unwrap_or_default() })
}

#[derive(Deserialize)]
struct ClosePositionRequest {
    position_id: String,
    close_price: Option<String>,
    close_reason: String,
    quote_asset_id: String,
}

#[derive(Serialize)]
struct CloseOrderResponse { success: bool, message: String }

async fn close_order_handler(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(payload): Json<ClosePositionRequest>,
) -> Json<CloseOrderResponse> {
    let position = match sqlx::query_as::<_, Position>("SELECT * FROM positions WHERE position_id = $1::uuid AND user_id = $2::uuid")
        .bind(&payload.position_id).bind(&auth.user_id).fetch_optional(&state.pool).await
    {
        Ok(Some(pos)) => pos,
        Ok(None) => return Json(CloseOrderResponse { success: false, message: "Position not found".to_string() }),
        Err(e) => return Json(CloseOrderResponse { success: false, message: format!("DB error: {}", e) }),
    };

    if position.position_status != "open" {
        return Json(CloseOrderResponse { success: false, message: "Position is already closed".to_string() });
    }

    let close_price: Decimal = payload.close_price.as_ref().and_then(|p| p.parse().ok()).unwrap_or(Decimal::ZERO);
    if close_price == Decimal::ZERO {
        return Json(CloseOrderResponse { success: false, message: "Invalid close price".to_string() });
    }

    let margin = position.entry_price * position.position_size;
    let pnl = if position.direction == "long" {
        (close_price - position.entry_price) * position.position_size
    } else {
        (position.entry_price - close_price) * position.position_size
    };
    let credit_amount = margin + pnl;

    let mut tx = match state.pool.begin().await {
        Ok(tx) => tx,
        Err(e) => return Json(CloseOrderResponse { success: false, message: format!("Transaction error: {}", e) }),
    };

    if let Err(e) = sqlx::query("UPDATE positions SET position_status = 'closed', close_price = $1, close_time = NOW(), profit_realized = $2 WHERE position_id = $3::uuid")
        .bind(close_price).bind(pnl).bind(&payload.position_id).execute(&mut *tx).await {
        return Json(CloseOrderResponse { success: false, message: format!("Update error: {}", e) });
    }

    if let Err(e) = sqlx::query("UPDATE balances SET quantity = quantity + $1 WHERE user_id = $2::uuid AND asset_id = $3::uuid")
        .bind(credit_amount).bind(position.user_id).bind(&payload.quote_asset_id).execute(&mut *tx).await {
        return Json(CloseOrderResponse { success: false, message: format!("Balance error: {}", e) });
    }

    if let Err(e) = sqlx::query(
        "INSERT INTO trade_history (id, position_id, user_id, asset_id, direction, quantity, entry_price, close_price, realized_pnl, close_reason, opened_at, closed_at) VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10, NOW())"
    ).bind(&payload.position_id).bind(position.user_id).bind(position.asset_id).bind(&position.direction)
    .bind(position.position_size).bind(position.entry_price).bind(close_price).bind(pnl).bind(&payload.close_reason).bind(position.open_time)
    .execute(&mut *tx).await {
        return Json(CloseOrderResponse { success: false, message: format!("History error: {}", e) });
    }

    if let Err(e) = tx.commit().await {
        return Json(CloseOrderResponse { success: false, message: format!("Commit error: {}", e) });
    }

    if let Ok(mut conn) = state.redis.get_multiplexed_async_connection().await {
        let event = serde_json::json!({
            "event_type": "Position Closed",
            "position_id": payload.position_id,
            "user_id": position.user_id.to_string(),
            "asset_id": position.asset_id.to_string(),
            "direction": position.direction,
            "entry_price": position.entry_price.to_string(),
            "close_price": close_price.to_string(),
            "pnl": pnl.to_string(),
            "close_reason": payload.close_reason,
        });
        let _ = conn.publish::<_, _, ()>("trade_events", event.to_string()).await;
    }

    Json(CloseOrderResponse { success: true, message: format!("Position closed. PnL: {}", pnl) })
}

#[derive(Deserialize)]
struct CandlesQuery { asset_id: String, duration: Option<String>, limit: Option<i32> }

#[derive(Serialize)]
struct CandlesResponse { candles: Vec<Candle> }

async fn candles_handler(Query(params): Query<CandlesQuery>, State(state): State<AppState>) -> Json<CandlesResponse> {
    let duration = params.duration.unwrap_or("1m".to_string());
    let limit = params.limit.unwrap_or(100);
    let result = sqlx::query_as::<_, Candle>("SELECT * FROM candles WHERE asset_id = $1::uuid AND trade_duration = $2 ORDER BY trade_time DESC LIMIT $3")
        .bind(&params.asset_id).bind(&duration).bind(limit).fetch_all(&state.pool).await;
    Json(CandlesResponse { candles: result.unwrap_or_default() })
}

#[derive(Deserialize)]
struct PnLQuery { current_price: String }

#[derive(Serialize)]
struct PositionPnL { position_id: String, direction: String, entry_price: String, position_size: String, unrealized_pnl: String, pnl_percentage: String }

#[derive(Serialize)]
struct PnLResponse { positions: Vec<PositionPnL>, total_unrealized_pnl: String, total_margin_used: String, equity: String }

async fn pnl_handler(auth: AuthUser, Query(params): Query<PnLQuery>, State(state): State<AppState>) -> Json<PnLResponse> {
    let current_price: Decimal = params.current_price.parse().unwrap_or(Decimal::ZERO);
    let positions = sqlx::query_as::<_, Position>("SELECT * FROM positions WHERE user_id = $1::uuid AND position_status = 'open'")
        .bind(&auth.user_id).fetch_all(&state.pool).await.unwrap_or_default();

    let mut position_pnls: Vec<PositionPnL> = Vec::new();
    let mut total_unrealized_pnl = Decimal::ZERO;
    let mut total_margin_used = Decimal::ZERO;

    for pos in positions {
        let unrealized_pnl = if pos.direction == "long" {
            (current_price - pos.entry_price) * pos.position_size
        } else {
            (pos.entry_price - current_price) * pos.position_size
        };
        let margin = pos.entry_price * pos.position_size;
        let pnl_pct = if margin > Decimal::ZERO { (unrealized_pnl / margin) * Decimal::from(100) } else { Decimal::ZERO };
        total_unrealized_pnl += unrealized_pnl;
        total_margin_used += margin;
        position_pnls.push(PositionPnL {
            position_id: pos.position_id.to_string(), direction: pos.direction,
            entry_price: pos.entry_price.to_string(), position_size: pos.position_size.to_string(),
            unrealized_pnl: unrealized_pnl.to_string(), pnl_percentage: format!("{:.2}%", pnl_pct),
        });
    }

    let available_balance = match sqlx::query_as::<_, Balance>("SELECT * FROM balances WHERE user_id = $1::uuid LIMIT 1")
        .bind(&auth.user_id).fetch_optional(&state.pool).await {
        Ok(Some(b)) => b.quantity.unwrap_or(Decimal::ZERO),
        _ => Decimal::ZERO,
    };

    Json(PnLResponse {
        positions: position_pnls,
        total_unrealized_pnl: total_unrealized_pnl.to_string(),
        total_margin_used: total_margin_used.to_string(),
        equity: (available_balance + total_margin_used + total_unrealized_pnl).to_string(),
    })
}

async fn connect_db(State(state): State<AppState>) -> String {
    let _: (i32,) = sqlx::query_as("SELECT 1").fetch_one(&state.pool).await.expect("Failed");
    "OK".to_string()
}

#[derive(Clone)]
struct AppState { pool: PgPool, redis: Client }

#[tokio::main]
async fn main() {
    let pool = shared::db::create_pool().await.expect("Failed to connect to DB");
    let cors = CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any);
    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1/".to_string());
    let client = redis::Client::open(redis_url.as_str()).expect("Failed to connect to Redis");
    let astate = AppState { pool, redis: client };

    let app = Router::new()
        .route("/", get(connect_db))
        .route("/signup", post(signup_handler))
        .route("/signin", post(signin_handler))
        .route("/candles", get(candles_handler))
        .route("/balance", get(balance_handler))
        .route("/orders", get(orders_handler))
        .route("/order/open", post(open_order_handler))
        .route("/order/close", post(close_order_handler))
        .route("/positions", get(positions_handler))
        .route("/pnl", get(pnl_handler))
        .layer(cors)
        .with_state(astate);

    let port = std::env::var("PORT").unwrap_or_else(|_| "3001".to_string());
    println!("API server running on http://0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port)).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
