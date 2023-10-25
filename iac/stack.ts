import { Stack, StackProps } from 'aws-cdk-lib';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { RustFunction, Settings } from 'rust.aws-cdk-lambda';

export class TodoAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Cargo workspace directory
    Settings.WORKSPACE_DIR = 'rust_lambdas';
    Settings.TARGET = 'aarch64-unknown-linux-gnu';

    new RustFunction(this, 'CreateTodo', {
      package: 'create_todo',
      setupLogging: true,
      architecture: Architecture.ARM_64,
      environment: {},
    });
  }
}
