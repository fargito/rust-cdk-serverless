use std::env;

use aws_lambda_events::apigw::ApiGatewayV2httpRequest;
use aws_sdk_dynamodb::types::AttributeValue;
use shared::{get_dynamodb_client, setup_dynamodb, setup_logging};

use lambda_runtime::{service_fn, Error, LambdaEvent};
use tracing::{debug, info};

use std::time::Instant;

#[tokio::main]
async fn main() -> Result<(), Error> {
    let start = Instant::now();

    setup_logging();
    setup_dynamodb().await;

    debug!("DynamoDB client initialized in {:.2?}", start.elapsed());

    let func = service_fn(handler);
    lambda_runtime::run(func).await?;

    Ok(())
}

pub(crate) async fn handler(event: LambdaEvent<ApiGatewayV2httpRequest>) -> Result<String, Error> {
    info!("Request: {:?}", event);

    let todos_table_name = env::var("TODOS_TABLE_NAME").expect("Missing TODOS_TABLE_NAME env var");

    let start = Instant::now();

    let dynamodb_client = get_dynamodb_client();

    debug!("DynamoDB client created in {:.2?}", start.elapsed());

    dynamodb_client
        .put_item()
        .table_name(todos_table_name)
        .item("PK", AttributeValue::S("TODO".into()))
        .item("SK", AttributeValue::S("TEST".into()))
        .item("content", AttributeValue::S("Miam".into()))
        .send()
        .await?;

    debug!("Item stored in {:.2?}", start.elapsed());

    Ok("Hello world!".into())
}
