import * as cdk from 'aws-cdk-lib';
import { Capture, Template } from 'aws-cdk-lib/assertions';

import * as TodoApp from '../iac/stack';

test('Resources are properly created', () => {
  const app = new cdk.App();
  const stack = new TodoApp.TodoAppStack(app, 'MyTestStack');

  const template = Template.fromStack(stack);

  const runtimeCapture = new Capture();
  const architectureCapture = new Capture();

  template.hasResourceProperties('AWS::Lambda::Function', {
    Architectures: architectureCapture,
    Runtime: runtimeCapture,
  });

  let architectureCaptureCount = 0;
  while (architectureCapture.next()) {
    architectureCaptureCount++;

    // all functions should have arm64 architecture
    expect(architectureCapture.asArray()).toEqual(['arm64']);
  }

  // we should have at least one lambda resource
  expect(architectureCaptureCount).toBeGreaterThan(0);

  let runtimeCaptureCount = 0;
  while (runtimeCapture.next()) {
    runtimeCaptureCount++;

    // all functions should have either nodejs or provided runtime
    expect(['provided.al2023', 'nodejs20.x']).toContain(
      runtimeCapture.asString(),
    );
  }

  // we should have at least one lambda resource
  expect(runtimeCaptureCount).toBeGreaterThan(0);

  template.resourceCountIs('AWS::Events::EventBus', 1);
  template.resourceCountIs('AWS::DynamoDB::Table', 2);
});
