use aws_lambda_events::http::StatusCode;
use aws_sdk_dynamodb::types::{AttributeValue, ReturnValue};
use aws_sdk_eventbridge::types::PutEventsRequestEntry;
use shared::{un_marshall_todo, FailureResponse};

use lambda_http::{
    tracing::{debug, error},
    Request, RequestExt,
};

use std::{collections::HashMap, time::Instant};

pub(crate) async fn handler(
    request: Request,
    dynamodb_client: &aws_sdk_dynamodb::Client,
    eventbridge_client: &aws_sdk_eventbridge::Client,
    todos_table_name: &str,
    event_bus_name: &str,
) -> Result<(StatusCode, serde_json::Value), FailureResponse> {
    let path_parameters = request.path_parameters();

    let id = path_parameters.first("todoId").ok_or(FailureResponse {
        status_code: StatusCode::BAD_REQUEST,
        body: "Invalid request".into(),
    })?;

    let start = Instant::now();

    let res = dynamodb_client
        .delete_item()
        .table_name(todos_table_name)
        .set_key(Some(HashMap::from([
            ("PK".into(), AttributeValue::S("TODO".into())),
            ("SK".into(), AttributeValue::S(format!("ID#{id}"))),
        ])))
        .return_values(ReturnValue::AllOld)
        .send()
        .await
        .map_err(|err| {
            error!(err = ?err, "Unable to set todo");

            FailureResponse {
                status_code: StatusCode::INTERNAL_SERVER_ERROR,
                body: "Unable to delete todo".into(),
            }
        })?;

    debug!("Item deleted in {:.2?}", start.elapsed());

    let todo = res.attributes.ok_or_else(|| {
        error!("Unexpected empty attributes");

        FailureResponse {
            status_code: StatusCode::INTERNAL_SERVER_ERROR,
            body: "Unexpected empty attributes".into(),
        }
    })?;

    let todo = un_marshall_todo(todo).map_err(|err| {
        error!(err = ?err, "Unable to serialize todo");

        FailureResponse {
            status_code: StatusCode::INTERNAL_SERVER_ERROR,
            body: "Unable to serialize todo".into(),
        }
    })?;

    let todo = serde_json::to_value(todo).map_err(|err| {
        error!(err = ?err, "Unable to serialize todo");

        FailureResponse {
            status_code: StatusCode::INTERNAL_SERVER_ERROR,
            body: "Unable to serialize todo".into(),
        }
    })?;

    let entries = PutEventsRequestEntry::builder()
        .event_bus_name(event_bus_name)
        .source("api.todos")
        .detail_type("TODO_DELETED")
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

    Ok((StatusCode::NO_CONTENT, "".into()))
}
