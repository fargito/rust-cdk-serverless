import { SignatureV4 } from '@smithy/signature-v4';
import { AxiosRequestConfig } from 'axios';

/**
 *
 * @param signatureV4
 * @param url
 * @param request
 * @returns
 */
export const getSignedAxiosConfig = async (
  signatureV4: SignatureV4,
  url: string,
  method: string,
  body?: unknown,
): Promise<AxiosRequestConfig> => {
  const apiUrl = new URL(url);

  if (body === undefined) {
    const signedRequest = await signatureV4.sign({
      method: method,
      hostname: apiUrl.host,
      path: apiUrl.pathname,
      protocol: apiUrl.protocol,
      headers: {
        'Content-Type': 'application/json',
        host: apiUrl.hostname, // compulsory for signature
      },
    });

    return {
      ...signedRequest,
      url,
    };
  } else {
    const stringifiedBody = JSON.stringify(body);

    const signedRequest = await signatureV4.sign({
      method: method,
      hostname: apiUrl.host,
      path: apiUrl.pathname,
      protocol: apiUrl.protocol,
      body: stringifiedBody,
      headers: {
        'Content-Type': 'application/json',
        host: apiUrl.hostname, // compulsory for signature
      },
    });

    return {
      ...signedRequest,
      url,
      data: stringifiedBody,
    };
  }
};
