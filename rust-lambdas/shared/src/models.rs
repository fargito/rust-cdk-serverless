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

impl TryFrom<HashMap<String, AttributeValue>> for Todo {
    type Error = DynamoDBError;

    fn try_from(item: HashMap<String, AttributeValue>) -> Result<Self, Self::Error> {
        Ok(Todo {
            id: item
                .get("id")
                .ok_or(DynamoDBError::MissingAttribute {
                    attribute: "id".into(),
                })?
                .to_owned()
                .as_s()
                .map_err(|err| {
                    error!(err = ?err, "Unable to query table");

                    DynamoDBError::InvalidAttribute {
                        attribute: "id".into(),
                    }
                })?
                .to_string(),
            list_id: item
                .get("list_id")
                .ok_or(DynamoDBError::MissingAttribute {
                    attribute: "list_id".into(),
                })?
                .to_owned()
                .as_s()
                .map_err(|err| {
                    error!(err = ?err, "Unable to query table");

                    DynamoDBError::InvalidAttribute {
                        attribute: "list_id".into(),
                    }
                })?
                .to_string(),
            title: item
                .get("title")
                .ok_or(DynamoDBError::MissingAttribute {
                    attribute: "title".into(),
                })?
                .to_owned()
                .as_s()
                .map_err(|err| {
                    error!(err = ?err, "Unable to query table");

                    DynamoDBError::InvalidAttribute {
                        attribute: "title".into(),
                    }
                })?
                .to_string(),
            description: item
                .get("description")
                .ok_or(DynamoDBError::MissingAttribute {
                    attribute: "description".into(),
                })?
                .to_owned()
                .as_s()
                .map_err(|err| {
                    error!(err = ?err, "Unable to query table");

                    DynamoDBError::InvalidAttribute {
                        attribute: "description".into(),
                    }
                })?
                .to_string(),
        })
    }
}
