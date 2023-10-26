use tokio::sync::OnceCell;

static DYNAMO_DB_CLIENT: OnceCell<aws_sdk_dynamodb::Client> = OnceCell::const_new();

pub async fn setup_dynamodb() {
    let config = aws_config::load_from_env().await;
    let dynamodb_client = aws_sdk_dynamodb::Client::new(&config);

    DYNAMO_DB_CLIENT
        .set(dynamodb_client)
        .expect("unable to initialize dynamodb client");
}

pub fn get_dynamodb_client() -> &'static aws_sdk_dynamodb::Client {
    DYNAMO_DB_CLIENT.get().expect(
        "dynamodb client was not initialized. Did you forget to call setup setup_dynamodb()?",
    )
}
