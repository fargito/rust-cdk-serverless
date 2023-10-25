use serde::Deserialize;
use shared::*;

use lambda_runtime::{service_fn, Error, LambdaEvent};
use tracing::info;

#[derive(Deserialize, Debug)]
struct Request {}

#[tokio::main]
async fn main() -> Result<(), Error> {
    setup_logging();

    let func = service_fn(handler);
    lambda_runtime::run(func).await?;

    Ok(())
}

pub(crate) async fn handler(event: LambdaEvent<Request>) -> Result<String, Error> {
    info!("Request: {:?}", event);

    Ok("Hello world!".into())
}
