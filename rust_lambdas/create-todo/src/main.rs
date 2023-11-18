mod handler;

use std::{convert::Infallible, env};

use aws_lambda_events::http::StatusCode;
use shared::setup_logging;

use lambda_http::{service_fn, Error, Request};
use tracing::debug;

use std::time::Instant;

use handler::handler;

#[tokio::main]
async fn main() -> Result<(), Error> {
    let start = Instant::now();

    setup_logging();

    let config = aws_config::load_from_env().await;
    let dynamodb_client = aws_sdk_dynamodb::Client::new(&config);

    let todos_table_name = env::var("TODOS_TABLE_NAME").expect("Missing TODOS_TABLE_NAME env var");

    debug!("DynamoDB client initialized in {:.2?}", start.elapsed());

    let func =
        service_fn(|request| handler_with_errors(request, &dynamodb_client, &todos_table_name));
    lambda_http::run(func).await?;

    Ok(())
}

async fn handler_with_errors(
    request: Request,
    dynamodb_client: &aws_sdk_dynamodb::Client,
    todos_table_name: &str,
) -> Result<(StatusCode, serde_json::Value), Infallible> {
    handler(request, &dynamodb_client, &todos_table_name)
        .await
        .or_else(|err| Ok((err.status_code, serde_json::Value::String(err.body))))
}
