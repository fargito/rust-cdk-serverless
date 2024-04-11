import {
  CloudFormationClient,
  ListExportsCommand,
} from '@aws-sdk/client-cloudformation';
import { fromEnv, fromIni } from '@aws-sdk/credential-providers';
import { config } from 'dotenv';

import { httpApiExportName } from 'iac/shared';

// load .env
config();

const credentials =
  process.env.CI === 'true'
    ? fromEnv()
    : fromIni({ profile: process.env.AWS_PROFILE });

const cloudformationClient = new CloudFormationClient({
  region: process.env.AWS_REGION,
  credentials,
});

// For now Cloudformation has no better way than to query all exports and filter client-side
const cfOutputs = await cloudformationClient.send(new ListExportsCommand({}));

const httpApiUrl = cfOutputs.Exports?.find(
  o => o.Name === httpApiExportName,
)?.Value;

if (httpApiUrl === undefined)
  throw new Error('unable to retrieve the HTTP URL');

globalThis.httpApiUrl = httpApiUrl;
