#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';

import { TodoAppStack } from './stack';
import { TestStack } from './test-stack';

const app = new cdk.App();
const { eventBusName } = new TodoAppStack(app, 'TodoAppStack');
new TestStack(app, 'TestStack', { eventBusName });
