import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { RustFunction, Settings } from 'rust.aws-cdk-lambda';

export class TodoAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const httpApi = new HttpApi(this, 'HttpApi');

    // Cargo workspace directory
    Settings.WORKSPACE_DIR = 'rust_lambdas';
    Settings.TARGET = 'aarch64-unknown-linux-gnu';

    const createTodoLambda = new RustFunction(this, 'CreateTodo', {
      package: 'create_todo',
      setupLogging: true,
      architecture: Architecture.ARM_64,
      environment: {},
    });

    const listTodosLambda = new RustFunction(this, 'ListTodos', {
      package: 'list_todos',
      setupLogging: true,
      architecture: Architecture.ARM_64,
      environment: {},
    });

    httpApi.addRoutes({
      path: '/todos',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        'CreateTodoIntegration',
        createTodoLambda,
      ),
    });

    httpApi.addRoutes({
      path: '/todos',
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        'ListTodosIntegration',
        listTodosLambda,
      ),
    });
  }
}
