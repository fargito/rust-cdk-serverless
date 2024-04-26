mod handler;

use std::env;
use std::time::Instant;

use aws_config::BehaviorVersion;
use lambda_http::{
    service_fn,
    tower::ServiceExt,
    tracing::{self, debug},
    Error,
};

use handler::handler;

#[tokio::main]
async fn main() -> Result<(), Error> {
    let start = Instant::now();

    tracing::init_default_subscriber();

    let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let dynamodb_client = aws_sdk_dynamodb::Client::new(&config);

    let todos_table_name = env::var("TODOS_TABLE_NAME").expect("Missing TODOS_TABLE_NAME env var");

    debug!("DynamoDB client initialized in {:.2?}", start.elapsed());

    let func = service_fn(|request| handler(request, &dynamodb_client, &todos_table_name))
        .map_result::<_, _, Error>(|res| match res {
            Ok(res) => Ok(res),
            Err(err) => Ok((err.status_code, err.body.into())),
        });
    lambda_http::run(func).await?;

    Ok(())
}
