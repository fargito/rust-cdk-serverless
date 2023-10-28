use aws_lambda_events::http::StatusCode;
use aws_sdk_dynamodb::types::AttributeValue;
use serde::Deserialize;
use shared::{FailureResponse, Todo};

use lambda_http::{Body, Error, IntoResponse, Request};
use tracing::debug;
use ulid::Ulid;

use std::time::Instant;

#[derive(Deserialize)]
struct CreateTodo {
    title: String,
    description: String,
}

pub(crate) async fn handler(
    request: Request,
    dynamodb_client: &aws_sdk_dynamodb::Client,
    todos_table_name: &str,
) -> Result<impl IntoResponse, Error> {
    let body = match request.body() {
        Body::Text(body) => {
            serde_json::from_str::<CreateTodo>(&body).map_err(|_| FailureResponse {
                body: "Invalid request".into(),
            })
        }
        _ => Err(FailureResponse {
            body: "Invalid request".into(),
        }),
    }?;

    let start = Instant::now();

    // generate ulid in order to have sorted items
    let id = Ulid::new().to_string();

    dynamodb_client
        .put_item()
        .table_name(todos_table_name)
        .item("PK", AttributeValue::S("TODO".into()))
        .item("SK", AttributeValue::S(format!("ID#{id}")))
        .item("title", AttributeValue::S(body.title.to_string()))
        .item(
            "description",
            AttributeValue::S(body.description.to_string()),
        )
        .send()
        .await
        .map_err(|_| FailureResponse {
            body: "Unable to set todo".into(),
        })?;

    debug!("Item stored in {:.2?}", start.elapsed());

    let todo = Todo {
        id,
        title: body.title,
        description: body.description,
    };

    let todo = serde_json::to_string(&todo).map_err(|_| FailureResponse {
        body: "Unable to serialize todo".into(),
    })?;

    Ok((StatusCode::OK, todo))
}
