import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import path, { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const baseLambdaDir = '../rust_lambdas/target/lambda/';

export class TodoAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const httpApi = new HttpApi(this, 'HttpApi');

    const todosTable = new Table(this, 'TodosTable', {
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    const createTodoLambda = new Function(this, 'CreateTodo', {
      architecture: Architecture.ARM_64,
      runtime: Runtime.PROVIDED_AL2023,
      code: Code.fromAsset(
        join(__dirname, baseLambdaDir, 'create_todo/bootstrap.zip'),
      ),
      handler: 'useless',
      memorySize: 1024,
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

    const listTodosLambda = new Function(this, 'ListTodos', {
      architecture: Architecture.ARM_64,
      runtime: Runtime.PROVIDED_AL2023,
      code: Code.fromAsset(
        join(__dirname, baseLambdaDir, 'list_todos/bootstrap.zip'),
      ),
      handler: 'useless',
      memorySize: 1024,
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

    new CfnOutput(this, 'ToDoApi', {
      value: httpApi.url ?? 'null',
      description: 'Todo Api endpoint',
      exportName: 'todo-api-endpoint',
    });
  }
}
