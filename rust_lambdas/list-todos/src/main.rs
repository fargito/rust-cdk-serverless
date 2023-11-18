mod handler;

use std::env;
use std::time::Instant;

use lambda_http::{service_fn, tower::ServiceExt, Error};

use shared::setup_logging;

use tracing::debug;

use handler::handler;

#[tokio::main]
async fn main() -> Result<(), Error> {
    let start = Instant::now();

    setup_logging();

    let config = aws_config::load_from_env().await;
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
