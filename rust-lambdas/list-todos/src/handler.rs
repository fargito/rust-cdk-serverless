use std::time::Instant;

use aws_sdk_dynamodb::types::AttributeValue;
use lambda_http::{http::StatusCode, Request};

use shared::{FailureResponse, Todo};
use tracing::{debug, error};

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
        .flat_map(|item| -> Result<Todo, DynamoDBError> {
            Ok(Todo {
                id: item
                    .get("id")
                    .ok_or(DynamoDBError::MissingAttribute { attribute: "id" })?
                    .to_owned()
                    .as_s()
                    .map_err(|err| {
                        error!(err = ?err, "Unable to query table");

                        DynamoDBError::InvalidAttribute { attribute: "id" }
                    })?
                    .to_string(),
                title: item
                    .get("title")
                    .ok_or(DynamoDBError::MissingAttribute { attribute: "title" })?
                    .to_owned()
                    .as_s()
                    .map_err(|err| {
                        error!(err = ?err, "Unable to query table");

                        DynamoDBError::InvalidAttribute { attribute: "title" }
                    })?
                    .to_string(),
                description: item
                    .get("description")
                    .ok_or(DynamoDBError::MissingAttribute {
                        attribute: "description",
                    })?
                    .to_owned()
                    .as_s()
                    .map_err(|err| {
                        error!(err = ?err, "Unable to query table");

                        DynamoDBError::InvalidAttribute {
                            attribute: "description",
                        }
                    })?
                    .to_string(),
            })
        })
        .collect();

    debug!("Item retrieved in {:.2?}", start.elapsed());

    let todos = serde_json::to_value(todos).map_err(|err| {
        error!(err = ?err, "Unable to query table");

        FailureResponse {
            status_code: StatusCode::INTERNAL_SERVER_ERROR,
            body: "Unable to serialize todo".into(),
        }
    })?;

    Ok((StatusCode::OK, todos))
}

#[derive(thiserror::Error, Debug)]
pub enum DynamoDBError<'a> {
    #[error("missing attribute {attribute}")]
    MissingAttribute { attribute: &'a str },
    #[error("invalid attribute {attribute}")]
    InvalidAttribute { attribute: &'a str },
}
