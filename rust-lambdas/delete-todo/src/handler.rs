use aws_lambda_events::http::StatusCode;
use aws_sdk_dynamodb::types::AttributeValue;
use shared::FailureResponse;

use lambda_http::{Request, RequestExt};
use tracing::debug;

use std::{collections::HashMap, time::Instant};

pub(crate) async fn handler(
    request: Request,
    dynamodb_client: &aws_sdk_dynamodb::Client,
    todos_table_name: &str,
) -> Result<(StatusCode, serde_json::Value), FailureResponse> {
    let path_parameters = request.path_parameters();

    let id = path_parameters.first("todoId").ok_or(FailureResponse {
        status_code: StatusCode::BAD_REQUEST,
        body: "Invalid request".into(),
    })?;

    let start = Instant::now();

    dynamodb_client
        .delete_item()
        .table_name(todos_table_name)
        .set_key(Some(HashMap::from([
            ("PK".into(), AttributeValue::S("TODO".into())),
            ("SK".into(), AttributeValue::S(format!("ID#{id}"))),
        ])))
        .send()
        .await
        .map_err(|_| FailureResponse {
            status_code: StatusCode::INTERNAL_SERVER_ERROR,
            body: "Unable to delete todo".into(),
        })?;

    debug!("Item deleted in {:.2?}", start.elapsed());

    Ok((StatusCode::NO_CONTENT, "".into()))
}