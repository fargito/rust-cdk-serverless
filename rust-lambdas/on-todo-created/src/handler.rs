use aws_lambda_events::eventbridge::EventBridgeEvent;
use lambda_runtime::{Error, LambdaEvent};
use shared::Todo;
use tracing::info;

pub(crate) async fn handler(
    event: LambdaEvent<EventBridgeEvent<Todo>>,
    _dynamodb_client: &aws_sdk_dynamodb::Client,
    _todos_table_name: &str,
) -> Result<(), Error> {
    info!(
        "Hello from async lambda, we have received message: {:?}",
        event.payload.detail.description
    );

    Ok(())
}
