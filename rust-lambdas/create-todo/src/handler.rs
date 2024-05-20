use aws_lambda_events::http::StatusCode;
use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_eventbridge::types::PutEventsRequestEntry;

use serde::Deserialize;
use shared::{FailureResponse, Todo};

use lambda_http::{
    tracing::{debug, error},
    Body, Request, RequestExt,
};
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
    eventbridge_client: &aws_sdk_eventbridge::Client,
    todos_table_name: &str,
    event_bus_name: &str,
) -> Result<(StatusCode, serde_json::Value), FailureResponse> {
    let path_parameters = request.path_parameters();

    let list_id = path_parameters.first("listId").ok_or(FailureResponse {
        status_code: StatusCode::BAD_REQUEST,
        body: "Missing list id".into(),
    })?;

    let body = match request.body() {
        Body::Text(body) => serde_json::from_str::<CreateTodo>(body).map_err(|_| FailureResponse {
            status_code: StatusCode::BAD_REQUEST,
            body: "Invalid request".into(),
        }),
        _ => Err(FailureResponse {
            status_code: StatusCode::BAD_REQUEST,
            body: "Invalid request".into(),
        }),
    }?;

    let start = Instant::now();

    // generate ulid in order to have sorted items
    let todo_id = Ulid::new().to_string();

    dynamodb_client
        .put_item()
        .table_name(todos_table_name)
        .item("PK", AttributeValue::S(format!("TODO#{list_id}")))
        .item("SK", AttributeValue::S(format!("ID#{todo_id}")))
        .item("id", AttributeValue::S(todo_id.clone()))
        .item("list_id", AttributeValue::S(list_id.to_string()))
        .item("title", AttributeValue::S(body.title.to_string()))
        .item(
            "description",
            AttributeValue::S(body.description.to_string()),
        )
        .send()
        .await
        .map_err(|err| {
            error!(err = ?err, "Unable to set todo");

            FailureResponse {
                status_code: StatusCode::INTERNAL_SERVER_ERROR,
                body: "Unable to set todo".into(),
            }
        })?;

    debug!("Item stored in {:.2?}", start.elapsed());

    let todo = Todo {
        id: todo_id,
        list_id: list_id.into(),
        title: body.title,
        description: body.description,
    };

    let todo = serde_json::to_value(todo).map_err(|_| FailureResponse {
        status_code: StatusCode::INTERNAL_SERVER_ERROR,
        body: "Unable to serialize todo".into(),
    })?;

    let entries = PutEventsRequestEntry::builder()
        .event_bus_name(event_bus_name)
        .source("api.todos")
        .detail_type("TODO_CREATED")
        .detail(todo.to_string())
        .build();

    // ignore the errors here
    let _ = eventbridge_client
        .put_events()
        .entries(entries)
        .send()
        .await
        .map_err(|err| {
            error!(err = ?err, "Unable to send confirmation event");

            FailureResponse {
                status_code: StatusCode::INTERNAL_SERVER_ERROR,
                body: "Unable to send confirmation event".into(),
            }
        });

    Ok((StatusCode::CREATED, todo))
}

#[cfg(test)]
mod tests {
    use super::*;
    use aws_sdk_eventbridge::operation::put_events::PutEventsOutput;
    use aws_smithy_mocks_experimental::{mock, mock_client};

    use aws_sdk_dynamodb::operation::put_item::PutItemOutput;
    use serde_json::json;

    #[tokio::test]
    async fn test_handler() {
        let mock_put_item = mock!(aws_sdk_dynamodb::Client::put_item)
            .then_output(|| PutItemOutput::builder().build());
        let dynamodb_client = mock_client!(aws_sdk_dynamodb, &[&mock_put_item]);

        let mock_put_events = mock!(aws_sdk_eventbridge::Client::put_events)
            .then_output(|| PutEventsOutput::builder().build());
        let eventbridge_client = mock_client!(aws_sdk_eventbridge, &[&mock_put_events]);

        let req = json!({
          "version": "2.0",
          "routeKey": "$default",
          "rawPath": "/my/path",
          "rawQueryString": "",
          "cookies": [],
          "headers": {},
          "queryStringParameters": {},
          "requestContext": {
            "accountId": "123456789012",
            "apiId": "api-id",
            "domainName": "id.execute-api.us-east-1.amazonaws.com",
            "domainPrefix": "id",
            "http": {
              "method": "POST",
              "path": "/my/path",
              "protocol": "HTTP/1.1",
              "sourceIp": "IP",
              "userAgent": "agent"
            },
            "requestId": "id",
            "routeKey": "$default",
            "stage": "$default",
            "time": "12/Mar/2020:19:03:58 +0000"
          },
          "body": "{\"title\": \"Toto todo\", \"description\": \"This is a great description\"}",
          "pathParameters": { "listId": "toto" },
          "isBase64Encoded": false,
          "stageVariables": {}
        })
        .to_string();

        let event = lambda_http::request::from_str(&req).unwrap();

        let (status, res) = handler(event, &dynamodb_client, &eventbridge_client, "toto", "tata")
            .await
            .expect("failed to handle event");

        assert_eq!(status, 201);

        let todo: Todo = serde_json::from_value(res).unwrap();

        assert_eq!(todo.title, "Toto todo");
        assert_eq!(todo.description, "This is a great description");
    }
}
