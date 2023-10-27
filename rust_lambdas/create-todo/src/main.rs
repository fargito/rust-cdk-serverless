use std::env;

use aws_lambda_events::http::StatusCode;
use aws_sdk_dynamodb::types::AttributeValue;
use serde::Deserialize;
use shared::{get_dynamodb_client, setup_dynamodb, setup_logging};

use lambda_http::{service_fn, Body, Error, IntoResponse, Request};
use tracing::debug;
use ulid::Ulid;

use std::time::Instant;

#[tokio::main]
async fn main() -> Result<(), Error> {
    let start = Instant::now();

    setup_logging();
    setup_dynamodb().await;

    debug!("DynamoDB client initialized in {:.2?}", start.elapsed());

    let func = service_fn(handler);
    lambda_http::run(func).await?;

    Ok(())
}

#[derive(Deserialize)]
struct CreateTodo {
    title: String,
    description: String,
}

pub(crate) async fn handler(
    request: Request,
) -> Result<impl IntoResponse, std::convert::Infallible> {
    let todos_table_name = env::var("TODOS_TABLE_NAME").expect("Missing TODOS_TABLE_NAME env var");

    let dynamodb_client = get_dynamodb_client();

    let body = match request.body() {
        Body::Empty => {
            return Ok((StatusCode::BAD_REQUEST, "Invalid body"));
        }
        Body::Text(body) => {
            if let Ok(body) = serde_json::from_str::<CreateTodo>(&body) {
                body
            } else {
                return Ok((StatusCode::BAD_REQUEST, "Invalid body"));
            }
        }
        Body::Binary(_body) => {
            return Ok((
                StatusCode::UNPROCESSABLE_ENTITY,
                "Binary body not supported",
            ));
        }
    };

    let start = Instant::now();

    // generate ulid in order to have sorted items
    let id = Ulid::new().to_string();

    if let Err(_) = dynamodb_client
        .put_item()
        .table_name(todos_table_name)
        .item("PK", AttributeValue::S("TODO".into()))
        .item("SK", AttributeValue::S(format!("ID#{id}")))
        .item("title", AttributeValue::S(body.title))
        .item("description", AttributeValue::S(body.description))
        .send()
        .await
    {
        return Ok((StatusCode::INTERNAL_SERVER_ERROR, "Unable to set todo"));
    };

    debug!("Item stored in {:.2?}", start.elapsed());

    Ok((StatusCode::OK, "Hello world!"))
}
