import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import * as TodoApp from '../iac/stack';

test('Resources are properly created', () => {
  const app = new cdk.App();
  const stack = new TodoApp.TodoAppStack(app, 'MyTestStack');

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::Lambda::Function', {
    Architectures: ['arm64'],
  });

  template.resourceCountIs('AWS::Events::EventBus', 1);
  template.resourceCountIs('AWS::DynamoDB::Table', 2);
});
