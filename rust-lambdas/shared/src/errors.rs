use aws_lambda_events::http::StatusCode;

#[derive(Debug)]
pub struct FailureResponse {
    pub status_code: StatusCode,
    pub body: String,
}

// Implement Display for the Failure response so that we can then implement Error.
impl std::fmt::Display for FailureResponse {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.body)
    }
}

// Implement Error for the FailureResponse so that we can `?` (try) the Response
// returned by `lambda_runtime::run(func).await` in `fn main`.
impl std::error::Error for FailureResponse {}

#[derive(thiserror::Error, Debug)]
pub enum DynamoDBError {
    #[error("empty attributes")]
    EmptyAttributes,
    #[error("missing attribute {attribute}")]
    MissingAttribute { attribute: String },
    #[error("invalid attribute {attribute}")]
    InvalidAttribute { attribute: String },
}
