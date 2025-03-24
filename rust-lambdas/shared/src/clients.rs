use aws_config::{BehaviorVersion, SdkConfig};
use aws_runtime::recursion_detection::RecursionDetectionInterceptor;
use tokio::sync::OnceCell;

static AWS_CONFIG: OnceCell<SdkConfig> = OnceCell::const_new();

async fn build_aws_config() -> aws_config::SdkConfig {
    aws_config::load_defaults(BehaviorVersion::latest()).await
}

pub async fn get_dynamodb_client() -> aws_sdk_dynamodb::Client {
    let config = AWS_CONFIG.get_or_init(build_aws_config).await;

    let dynamodb_config = aws_sdk_dynamodb::config::Builder::from(config)
        .interceptor(RecursionDetectionInterceptor::new())
        .build();

    aws_sdk_dynamodb::Client::from_conf(dynamodb_config)
}

pub async fn get_event_bridge_client() -> aws_sdk_eventbridge::Client {
    let config = AWS_CONFIG.get_or_init(build_aws_config).await;

    let eventbridge_config = aws_sdk_eventbridge::config::Builder::from(config)
        .interceptor(RecursionDetectionInterceptor::new())
        .build();

    aws_sdk_eventbridge::Client::from_conf(eventbridge_config)
}
