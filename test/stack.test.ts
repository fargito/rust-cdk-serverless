import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';

import * as TodoApp from '../iac/stack';

test('Resources are properly created', () => {
  const app = new cdk.App();
  const stack = new TodoApp.TodoAppStack(app, 'MyTestStack');

  const template = Template.fromStack(stack);

  template.allResourcesProperties('AWS::Lambda::Function', {
    // all functions should have arm64 architecture
    Architectures: Match.arrayEquals(['arm64']),
    // all functions should have json logging
    LoggingConfig: { LogFormat: 'JSON' },
    // all functions should have the same runtime
    Runtime: 'provided.al2023',
  });

  template.resourceCountIs('AWS::Lambda::Function', 5);
  template.resourceCountIs('AWS::Events::EventBus', 1);
  template.resourceCountIs('AWS::DynamoDB::Table', 1);
});
