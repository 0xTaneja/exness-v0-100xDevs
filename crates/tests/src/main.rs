use shared::db::create_pool;

#[tokio::main]
async fn main() {
    println!("Testing DB connection...");

    match create_pool().await {
        Ok(pool) => {
            println!("Connected to PostgreSQL!");

            
            let result: (i32,) = sqlx::query_as("SELECT 1")
                .fetch_one(&pool)
                .await
                .expect("Failed to run test query");

            println!("Test query returned: {}", result.0);
            println!("DB connection test PASSED!");
        }
        Err(e) => {
            println!("Failed to connect to DB: {}", e);
            println!("DB connection test FAILED!");
            std::process::exit(1);
        }
    }
}
