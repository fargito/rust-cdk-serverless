import { EventScout } from '@event-scout/construct';
import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';

import { eventScoutEndpointExportName } from './shared';

export class TestStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: StackProps & { eventBusName: string },
  ) {
    super(scope, id, props);

    // event scout resources
    const { httpEndpoint: eventScoutEndpoint } = new EventScout(
      this,
      'EventScout',
      { eventBus: EventBus.fromEventBusName(this, 'Bus', props.eventBusName) },
    );

    new CfnOutput(this, 'EventScoutEndpoint', {
      value: eventScoutEndpoint,
      description: 'EventScout endpoint',
      exportName: eventScoutEndpointExportName,
    });
  }
}
