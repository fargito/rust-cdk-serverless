use std::time::Instant;

use aws_sdk_dynamodb::types::AttributeValue;
use lambda_http::{http::StatusCode, Request};

use shared::{FailureResponse, Todo};
use tracing::debug;

pub(crate) async fn handler(
    _request: Request,
    dynamodb_client: &aws_sdk_dynamodb::Client,
    todos_table_name: &str,
) -> Result<(StatusCode, serde_json::Value), FailureResponse> {
    let start = Instant::now();

    let result = dynamodb_client
        .query()
        .table_name(todos_table_name)
        .key_condition_expression("PK = :PK AND begins_with(SK, :SK)")
        .expression_attribute_values(":PK", AttributeValue::S("TODO".into()))
        .expression_attribute_values(":SK", AttributeValue::S("ID#".into()))
        .send()
        .await
        .map_err(|_| FailureResponse {
            status_code: StatusCode::INTERNAL_SERVER_ERROR,
            body: "Unable to set todo".into(),
        })?;

    debug!("{result:?}");

    let todos: Vec<Todo> = result
        .items
        .ok_or(FailureResponse {
            status_code: StatusCode::INTERNAL_SERVER_ERROR,
            body: "Got no items from DynamoDB".into(),
        })?
        .into_iter()
        // TODO handle errors gracefully here
        .map(|item| Todo {
            id: item.get("id").unwrap().to_owned().as_s().unwrap().clone(),
            title: item
                .get("title")
                .unwrap()
                .to_owned()
                .as_s()
                .unwrap()
                .clone(),
            description: item
                .get("description")
                .unwrap()
                .to_owned()
                .as_s()
                .unwrap()
                .clone(),
        })
        .collect();

    debug!("Item retrieved in {:.2?}", start.elapsed());

    let todos = serde_json::to_value(todos).map_err(|_| FailureResponse {
        status_code: StatusCode::INTERNAL_SERVER_ERROR,
        body: "Unable to serialize todo".into(),
    })?;

    Ok((StatusCode::OK, todos))
}
