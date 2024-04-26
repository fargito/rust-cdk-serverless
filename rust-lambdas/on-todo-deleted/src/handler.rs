use aws_lambda_events::eventbridge::EventBridgeEvent;
use aws_sdk_dynamodb::types::AttributeValue;
use lambda_runtime::{
    tracing::{error, info},
    Error, LambdaEvent,
};
use shared::Todo;

pub(crate) async fn handler(
    event: LambdaEvent<EventBridgeEvent<Todo>>,
    dynamodb_client: &aws_sdk_dynamodb::Client,
    todos_table_name: &str,
) -> Result<(), Error> {
    info!(
        "Hello from async lambda, we have received message: {:?}",
        event.payload.detail.description
    );

    dynamodb_client
        .update_item()
        .table_name(todos_table_name)
        .key("PK", AttributeValue::S("TODO".into()))
        .key("SK", AttributeValue::S("COUNTER".into()))
        .update_expression("ADD todosCount :increment")
        .expression_attribute_values(":increment", AttributeValue::N("-1".into()))
        .send()
        .await
        .map_err(|err| {
            error!(err = ?err, "Unable to set counter");

            err
        })?;

    Ok(())
}
