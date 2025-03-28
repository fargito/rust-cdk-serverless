/* eslint-disable max-lines */
import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpIamAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { EventBus, EventPattern, Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  Architecture,
  Code,
  Function,
  LoggingFormat,
  Runtime,
  Tracing,
} from 'aws-cdk-lib/aws-lambda';
import { LogGroup, LogGroupProps, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import path, { join } from 'path';
import { fileURLToPath } from 'url';

import { defaultStage, getHttpApiExportName } from './shared';

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
  eventBusName: string;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const httpApi = new HttpApi(this, 'HttpApi', {
      defaultAuthorizer: new HttpIamAuthorizer(),
    });

    const todosTable = new Table(this, 'TodosTable', {
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const eventBus = new EventBus(this, 'EventBus');

    this.eventBusName = eventBus.eventBusName;

    const logGroupProps: LogGroupProps = {
      retention: RetentionDays.FIVE_DAYS,
      removalPolicy: RemovalPolicy.DESTROY, // do not keep log group if it is no longer included in a deployment
    };

    const httpLambdasConfig: Record<string, HttpLambdaConfig> = {
      CreateTodo: {
        codePath: 'create-todo/bootstrap.zip',
        httpMethod: HttpMethod.POST,
        httpPath: '/todos/{listId}',
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
        httpPath: '/todos/{listId}',
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
        httpPath: '/todos/{listId}/{todoId}',
        policy: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [todosTable.tableArn],
            actions: ['dynamodb:DeleteItem'],
          }),
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [eventBus.eventBusArn],
            actions: ['events:PutEvents'],
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
        loggingFormat: LoggingFormat.JSON,
        tracing: Tracing.ACTIVE,
        logGroup: new LogGroup(this, `${lambdaName}Logs`, logGroupProps),
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
      OnTodoDeleted: {
        codePath: 'on-todo-deleted/bootstrap.zip',
        policy: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [todosTable.tableArn],
            actions: ['dynamodb:UpdateItem'],
          }),
        ],
        eventPattern: {
          source: ['api.todos'],
          detailType: ['TODO_DELETED'],
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
        loggingFormat: LoggingFormat.JSON,
        tracing: Tracing.ACTIVE,
        logGroup: new LogGroup(this, `${lambdaName}Logs`, logGroupProps),
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

    const httpApiExportName = getHttpApiExportName(
      (this.node.tryGetContext('stage') as string | undefined) ?? defaultStage,
    );

    new CfnOutput(this, 'ToDoApi', {
      value: httpApi.url ?? 'null',
      description: 'Todo Api endpoint',
      exportName: httpApiExportName,
    });
  }
}
