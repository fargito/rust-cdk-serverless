import { Sha256 } from '@aws-crypto/sha256-js';
import {
  CloudFormationClient,
  ListExportsCommand,
} from '@aws-sdk/client-cloudformation';
import { fromEnv, fromIni } from '@aws-sdk/credential-providers';
import { EventScoutClient } from '@event-scout/client';
import { SignatureV4 } from '@smithy/signature-v4';
import { config } from 'dotenv';

import { eventScoutEndpointExportName, httpApiExportName } from 'iac/shared';

// load .env
config();

const credentials =
  process.env.CI === 'true'
    ? fromEnv()
    : fromIni({ profile: process.env.AWS_PROFILE });

const region = process.env.AWS_REGION;

if (region === undefined) {
  throw new Error('expected region');
}

const cloudformationClient = new CloudFormationClient({
  region,
  credentials,
});

// For now Cloudformation has no better way than to query all exports and filter client-side
const cfOutputs = await cloudformationClient.send(new ListExportsCommand({}));

const httpApiUrl = cfOutputs.Exports?.find(
  o => o.Name === httpApiExportName,
)?.Value;

if (httpApiUrl === undefined) {
  throw new Error('unable to retrieve the HTTP URL');
}

const eventScoutEndpoint = cfOutputs.Exports?.find(
  o => o.Name === eventScoutEndpointExportName,
)?.Value;

if (eventScoutEndpoint === undefined) {
  throw new Error('unable to retrieve the EventScout endpoint');
}

const signatureV4 = new SignatureV4({
  service: 'execute-api',
  region,
  credentials,
  sha256: Sha256,
});

const eventScoutClient = new EventScoutClient({
  credentials,
  region,
  endpoint: eventScoutEndpoint,
});

globalThis.eventScoutClient = eventScoutClient;
globalThis.httpApiUrl = httpApiUrl;
globalThis.signatureV4 = signatureV4;
