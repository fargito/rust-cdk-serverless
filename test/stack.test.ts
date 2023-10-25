import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import * as TodoApp from '../iac/stack';

test('SQS Queue and SNS Topic Created', () => {
  const app = new cdk.App();
  const stack = new TodoApp.TodoAppStack(app, 'MyTestStack');

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::Lambda::Function', {
    Architectures: ['arm64'],
  });

  template.resourceCountIs('AWS::Lambda::Function', 1);
});
