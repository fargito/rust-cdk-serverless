use std::env;

use aws_lambda_events::apigw::ApiGatewayV2httpRequest;
use aws_sdk_dynamodb::types::AttributeValue;
use shared::*;

use lambda_runtime::{service_fn, Error, LambdaEvent};
use tracing::info;

#[tokio::main]
async fn main() -> Result<(), Error> {
    setup_logging();

    let func = service_fn(handler);
    lambda_runtime::run(func).await?;

    Ok(())
}

pub(crate) async fn handler(event: LambdaEvent<ApiGatewayV2httpRequest>) -> Result<String, Error> {
    info!("Request: {:?}", event);

    let todos_table_name = env::var("TODOS_TABLE_NAME").expect("Missing TODOS_TABLE_NAME env var");

    // initialize dynamodb client
    let config = aws_config::load_from_env().await;
    let dynamodb_client = aws_sdk_dynamodb::Client::new(&config);

    dynamodb_client
        .put_item()
        .table_name(todos_table_name)
        .item("PK", AttributeValue::S("TODO".into()))
        .item("SK", AttributeValue::S("TEST".into()))
        .item("content", AttributeValue::S("Miam".into()))
        .send()
        .await?;

    Ok("Hello world!".into())
}
