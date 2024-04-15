import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpIamAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import path, { join } from 'path';
import { fileURLToPath } from 'url';

import { httpApiExportName } from './shared';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const baseLambdaDir = '../rust-lambdas/target/lambda/';

type LambdaConfig = {
  codePath: string;
  httpPath: string;
  httpMethod: HttpMethod;
  policy: PolicyStatement[];
};

export class TodoAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const httpApi = new HttpApi(this, 'HttpApi', {
      defaultAuthorizer: new HttpIamAuthorizer(),
    });

    const todosTable = new Table(this, 'TodosTable', {
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    const lambdasConfig: Record<string, LambdaConfig> = {
      CreateTodo: {
        codePath: 'create-todo/bootstrap.zip',
        httpMethod: HttpMethod.POST,
        httpPath: '/todos',
        policy: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [todosTable.tableArn],
            actions: ['dynamodb:PutItem'],
          }),
        ],
      },
      ListTodos: {
        codePath: 'list-todos/bootstrap.zip',
        httpMethod: HttpMethod.GET,
        httpPath: '/todos',
        policy: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [todosTable.tableArn],
            actions: ['dynamodb:Query'],
          }),
        ],
      },
      DeleteTodo: {
        codePath: 'delete-todo/bootstrap.zip',
        httpMethod: HttpMethod.DELETE,
        httpPath: '/todos/{todoId}',
        policy: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [todosTable.tableArn],
            actions: ['dynamodb:DeleteItem'],
          }),
        ],
      },
    };

    Object.entries(lambdasConfig).map(([lambdaName, lambdaConfig]) => {
      // create the lambda
      const lambda = new Function(this, lambdaName, {
        architecture: Architecture.ARM_64,
        runtime: Runtime.PROVIDED_AL2023,
        code: Code.fromAsset(
          join(__dirname, baseLambdaDir, lambdaConfig.codePath),
        ),
        handler: 'useless',
        memorySize: 1024,
        environment: {
          TODOS_TABLE_NAME: todosTable.tableName,
        },
        initialPolicy: lambdaConfig.policy,
      });

      // add it to the http api
      httpApi.addRoutes({
        path: lambdaConfig.httpPath,
        methods: [lambdaConfig.httpMethod],
        integration: new HttpLambdaIntegration(
          `${lambdaName}Integration`,
          lambda,
        ),
      });
    });

    new CfnOutput(this, 'ToDoApi', {
      value: httpApi.url ?? 'null',
      description: 'Todo Api endpoint',
      exportName: httpApiExportName,
    });
  }
}
