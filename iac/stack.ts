/* eslint-disable max-lines */
import { EventScout } from '@event-scout/construct';
import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpIamAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { EventBus, EventPattern, Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import path, { join } from 'path';
import { fileURLToPath } from 'url';

import { eventScoutEndpointExportName, httpApiExportName } from './shared';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const baseLambdaDir = '../rust-lambdas/target/lambda/';

type LambdaConfig = {
  codePath: string;
  policy: PolicyStatement[];
};

type HttpLambdaConfig = LambdaConfig & {
  httpPath: string;
  httpMethod: HttpMethod;
};

type AsyncLambdaConfig = LambdaConfig & {
  eventPattern: EventPattern;
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

    const eventBus = new EventBus(this, 'EventBus');

    // event scout resources
    const { restEndpoint: eventScoutEndpoint } = new EventScout(
      this,
      'EventScout',
      { eventBus },
    );

    const httpLambdasConfig: Record<string, HttpLambdaConfig> = {
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
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [eventBus.eventBusArn],
            actions: ['events:PutEvents'],
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

    // HTTP Lambdas config
    Object.entries(httpLambdasConfig).map(([lambdaName, lambdaConfig]) => {
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
          EVENT_BUS_NAME: eventBus.eventBusName,
          RUST_LOG: 'info',
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

    const asyncLambdasConfig: Record<string, AsyncLambdaConfig> = {
      OnTodoCreated: {
        codePath: 'on-todo-created/bootstrap.zip',
        policy: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [todosTable.tableArn],
            actions: ['dynamodb:UpdateItem'],
          }),
        ],
        eventPattern: {
          source: ['api.todos'],
          detailType: ['TODO_CREATED'],
        },
      },
    };

    // Async Lambdas config
    Object.entries(asyncLambdasConfig).map(([lambdaName, lambdaConfig]) => {
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
          RUST_LOG: 'info',
        },
        initialPolicy: lambdaConfig.policy,
      });

      // add the rule
      new Rule(this, `${lambdaName}Rule`, {
        eventPattern: lambdaConfig.eventPattern,
        eventBus,
        targets: [new LambdaFunction(lambda)],
      });
    });

    new CfnOutput(this, 'ToDoApi', {
      value: httpApi.url ?? 'null',
      description: 'Todo Api endpoint',
      exportName: httpApiExportName,
    });

    new CfnOutput(this, 'EventScoutEndpoint', {
      value: eventScoutEndpoint,
      description: 'EventScout endpoint',
      exportName: eventScoutEndpointExportName,
    });
  }
}
