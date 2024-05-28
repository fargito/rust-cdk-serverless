#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';

import { defaultStage } from './shared';
import { TodoAppStack } from './stack';
import { TestStack } from './test-stack';

const app = new cdk.App();

const stage =
  (app.node.tryGetContext('stage') as string | undefined) ?? defaultStage;

const { eventBusName } = new TodoAppStack(app, `todos-api-${stage}`);
new TestStack(app, `test-todos-api-${stage}`, { eventBusName });
