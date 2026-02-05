use axum::{Router, routing::get};



#[tokio::main]
async fn main() {
  let app = Router::new().route("/health",get(hello_world));
    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port)).await.unwrap();
    axum::serve(listener,app).await.unwrap();


}
async fn hello_world() -> &'static str {
    "Hello World"
}