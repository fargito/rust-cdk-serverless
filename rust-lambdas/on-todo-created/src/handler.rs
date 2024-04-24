use lambda_runtime::{Error, LambdaEvent};
use serde_json::Value;
use tracing::info;

pub(crate) async fn handler(
    event: LambdaEvent<Value>,
    _dynamodb_client: &aws_sdk_dynamodb::Client,
    _todos_table_name: &str,
) -> Result<Value, Error> {
    info!("Hello from async lambda {event:?}");

    Ok("toto".into())
}
