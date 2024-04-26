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
    let eventbridge_client = aws_sdk_eventbridge::Client::new(&config);

    let todos_table_name = env::var("TODOS_TABLE_NAME").expect("Missing TODOS_TABLE_NAME env var");
    let event_bus_name = env::var("EVENT_BUS_NAME").expect("Missing EVENT_BUS_NAME env var");

    debug!("DynamoDB client initialized in {:.2?}", start.elapsed());

    let func = service_fn(|request| {
        handler(
            request,
            &dynamodb_client,
            &eventbridge_client,
            &todos_table_name,
            &event_bus_name,
        )
    })
    .map_result::<_, _, Error>(|res| match res {
        Ok(res) => Ok(res),
        Err(err) => Ok((err.status_code, err.body.into())),
    });
    lambda_http::run(func).await?;

    Ok(())
}
