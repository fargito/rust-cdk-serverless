import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Stack, StackProps } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { RustFunction, Settings } from 'rust.aws-cdk-lambda';

export class TodoAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const httpApi = new HttpApi(this, 'HttpApi');

    const todosTable = new Table(this, 'TodosTable', {
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    // Cargo workspace directory
    Settings.WORKSPACE_DIR = 'rust_lambdas';
    Settings.TARGET = 'aarch64-unknown-linux-gnu';
    Settings.RUNTIME = Runtime.PROVIDED_AL2023;

    const createTodoLambda = new RustFunction(this, 'CreateTodo', {
      package: 'create_todo',
      setupLogging: true,
      architecture: Architecture.ARM_64,
      memorySize: 1024,
      logRetention: RetentionDays.ONE_DAY,
      environment: {
        TODOS_TABLE_NAME: todosTable.tableName,
      },
      initialPolicy: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          resources: [todosTable.tableArn],
          actions: ['dynamodb:PutItem'],
        }),
      ],
    });

    const listTodosLambda = new RustFunction(this, 'ListTodos', {
      package: 'list_todos',
      setupLogging: true,
      architecture: Architecture.ARM_64,
      memorySize: 1024,
      logRetention: RetentionDays.ONE_DAY,
      environment: {
        TODOS_TABLE_NAME: todosTable.tableName,
      },
      initialPolicy: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          resources: [todosTable.tableArn],
          actions: ['dynamodb:Query'],
        }),
      ],
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
