import { SignatureV4 } from '@smithy/signature-v4';
import axios from 'axios';

import { getSignedAxiosConfig } from './getSignedRequest';

describe('todos CRUD API', () => {
  const httpApiUrl = globalThis.httpApiUrl;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const signatureV4: SignatureV4 = globalThis.signatureV4;

  describe('authentication', () => {
    it('should return a 403 when calling with no authorization', async () => {
      const response = await fetch(`${httpApiUrl}todos`);

      expect(response.status).toBe(403);
    });

    it('should return a 200 when properly authorizing', async () => {
      const signedRequest = await getSignedAxiosConfig(
        signatureV4,
        `${httpApiUrl}todos`,
        'GET',
      );

      const response = await axios(signedRequest);

      expect(response.status).toBe(200);
    });
  });
});
