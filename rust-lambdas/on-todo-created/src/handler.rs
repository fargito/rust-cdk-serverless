use aws_lambda_events::eventbridge::EventBridgeEvent;
use aws_sdk_dynamodb::types::AttributeValue;
use lambda_runtime::{
    tracing::{self, error, info},
    Error, LambdaEvent,
};
use shared::Todo;

#[tracing::instrument(skip_all)]
pub(crate) async fn handler(
    event: LambdaEvent<EventBridgeEvent<Todo>>,
    dynamodb_client: &aws_sdk_dynamodb::Client,
    todos_table_name: &str,
) -> Result<(), Error> {
    info!(
        todo_id = event.payload.detail.id,
        list_id = event.payload.detail.list_id,
        "Received todo.created event",
    );

    dynamodb_client
        .update_item()
        .table_name(todos_table_name)
        .key(
            "PK",
            AttributeValue::S(format!("TODO#{}", event.payload.detail.list_id)),
        )
        .key("SK", AttributeValue::S("COUNTER".into()))
        .update_expression("ADD todosCount :increment")
        .expression_attribute_values(":increment", AttributeValue::N("1".into()))
        .send()
        .await
        .map_err(|err| {
            error!(err = ?err, "Unable to set counter");

            err
        })?;

    Ok(())
}
