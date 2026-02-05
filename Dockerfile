FROM rust:1.85-bookworm AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY crates/ crates/
COPY migrations/ migrations/
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/api-server /app/
COPY --from=builder /app/target/release/ws-server /app/
COPY --from=builder /app/target/release/price-poller /app/
COPY --from=builder /app/target/release/batch-uploader /app/
COPY --from=builder /app/target/release/trigger-engine /app/
COPY --from=builder /app/target/release/email-worker /app/
COPY --from=builder /app/target/release/hedging-worker /app/
COPY migrations/ /app/migrations/
CMD ["/app/api-server"]
