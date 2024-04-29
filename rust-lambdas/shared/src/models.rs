use std::collections::HashMap;

use aws_sdk_dynamodb::types::AttributeValue;
use serde::{Deserialize, Serialize};
use tracing::error;

use crate::DynamoDBError;

#[derive(Serialize, Deserialize)]
pub struct Todo {
    pub id: String,
    pub list_id: String,
    pub title: String,
    pub description: String,
}

pub fn un_marshall_todo<'a>(
    item: HashMap<String, AttributeValue>,
) -> Result<Todo, DynamoDBError<'a>> {
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
        list_id: item
            .get("list_id")
            .ok_or(DynamoDBError::MissingAttribute {
                attribute: "list_id",
            })?
            .to_owned()
            .as_s()
            .map_err(|err| {
                error!(err = ?err, "Unable to query table");

                DynamoDBError::InvalidAttribute {
                    attribute: "list_id",
                }
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
}
