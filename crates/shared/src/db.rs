
use sqlx::{PgPool, postgres::PgPoolOptions};


pub async fn create_pool() -> Result<PgPool,sqlx::Error>{
    let db_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/exness_v0".to_string());
    PgPoolOptions::new().max_connections(5).connect(&db_url).await

}