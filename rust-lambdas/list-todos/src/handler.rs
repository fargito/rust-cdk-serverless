use std::time::Instant;

use aws_sdk_dynamodb::types::AttributeValue;
use lambda_http::{
    http::StatusCode,
    tracing::{debug, error},
    Request, RequestExt,
};

use shared::{un_marshall_todo, FailureResponse, Todo};

pub(crate) async fn handler(
    request: Request,
    dynamodb_client: &aws_sdk_dynamodb::Client,
    todos_table_name: &str,
) -> Result<(StatusCode, serde_json::Value), FailureResponse> {
    let path_parameters = request.path_parameters();

    let list_id = path_parameters.first("listId").ok_or(FailureResponse {
        status_code: StatusCode::BAD_REQUEST,
        body: "Missing list id".into(),
    })?;

    let start = Instant::now();

    let result = dynamodb_client
        .query()
        .table_name(todos_table_name)
        .key_condition_expression("PK = :PK AND begins_with(SK, :SK)")
        .expression_attribute_values(":PK", AttributeValue::S(format!("TODO#{list_id}")))
        .expression_attribute_values(":SK", AttributeValue::S("ID#".into()))
        .send()
        .await
        .map_err(|err| {
            error!(err = ?err, "Unable to query table");

            FailureResponse {
                status_code: StatusCode::INTERNAL_SERVER_ERROR,
                body: "Unable to set todo".into(),
            }
        })?;

    debug!("{result:?}");

    let todos: Vec<Todo> = result
        .items
        .ok_or(FailureResponse {
            status_code: StatusCode::INTERNAL_SERVER_ERROR,
            body: "Got no items from DynamoDB".into(),
        })?
        .into_iter()
        .flat_map(un_marshall_todo)
        .collect();

    debug!("Item retrieved in {:.2?}", start.elapsed());

    let todos = serde_json::to_value(todos).map_err(|err| {
        error!(err = ?err, "Unable to serialize todo");

        FailureResponse {
            status_code: StatusCode::INTERNAL_SERVER_ERROR,
            body: "Unable to serialize todo".into(),
        }
    })?;

    Ok((StatusCode::OK, todos))
}
