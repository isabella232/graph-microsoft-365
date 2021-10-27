import { gunzipSync } from 'zlib';

import {
  Recording,
  RecordingEntry,
  setupRecording,
  SetupRecordingInput,
} from '@jupiterone/integration-sdk-testing';

export { Recording };

export function setupAzureRecording(
  input: Omit<SetupRecordingInput, 'mutateEntry'>,
): Recording {
  return setupRecording({
    ...input,
    mutateEntry: mutateRecordingEntry,
  });
}

function mutateRecordingEntry(entry: RecordingEntry): void {
  let responseText = entry.response.content.text;
  if (!responseText) {
    return;
  }

  const contentEncoding = entry.response.headers.find(
    (e) => e.name === 'content-encoding',
  );
  const transferEncoding = entry.response.headers.find(
    (e) => e.name === 'transfer-encoding',
  );

  if (contentEncoding && contentEncoding.value === 'gzip') {
    const chunkBuffers: Buffer[] = [];
    const hexChunks = JSON.parse(responseText) as string[];
    hexChunks.forEach((chunk) => {
      const chunkBuffer = Buffer.from(chunk, 'hex');
      chunkBuffers.push(chunkBuffer);
    });

    responseText = gunzipSync(Buffer.concat(chunkBuffers)).toString('utf-8');

    // Remove encoding/chunking since content is now unzipped
    entry.response.headers = entry.response.headers.filter(
      (e) => e && e !== contentEncoding && e !== transferEncoding,
    );
    // Remove recording binary marker
    delete (entry.response.content as any)._isBinary;
    entry.response.content.text = responseText;
  }

  const responseJson = JSON.parse(responseText);

  const DEFAULT_REDACT = '[REDACTED]';
  const keysToRedactMap = new Map();
  keysToRedactMap.set('serialNumber', DEFAULT_REDACT);
  keysToRedactMap.set('deviceName', DEFAULT_REDACT);
  keysToRedactMap.set('emailAddress', 'redacted@email.com');
  keysToRedactMap.set('userPrincipalName', DEFAULT_REDACT);
  keysToRedactMap.set('imei', DEFAULT_REDACT);
  keysToRedactMap.set('phoneNumber', DEFAULT_REDACT);
  keysToRedactMap.set('wiFiMacAddress', DEFAULT_REDACT);
  keysToRedactMap.set('meid', DEFAULT_REDACT);
  keysToRedactMap.set('managedDeviceName', DEFAULT_REDACT);
  keysToRedactMap.set('userName', DEFAULT_REDACT);
  keysToRedactMap.set('deviceDisplayName', DEFAULT_REDACT);
  keysToRedactMap.set('hardwareSerial', DEFAULT_REDACT);

  if (responseJson?.value?.forEach) {
    responseJson.value.forEach((responseValue, index) => {
      keysToRedactMap.forEach((redactionValue, keyToRedact) => {
        if (responseValue[keyToRedact]) {
          responseJson.value[index][keyToRedact] = redactionValue;
        }
      });
    });
    entry.response.content.text = JSON.stringify(responseJson);
  }

  if (/login/.exec(entry.request.url) && entry.request.postData) {
    // Redact request body with secrets for authentication
    entry.request.postData.text = '[REDACTED]';

    // Redact authentication response token
    if (responseJson.access_token) {
      entry.response.content.text = JSON.stringify(
        {
          ...responseJson,
          access_token: '[REDACTED]',
        },
        null,
        0,
      );
    }
  }
}
