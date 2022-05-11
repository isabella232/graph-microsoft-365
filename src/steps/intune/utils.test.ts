import { createMockIntegrationLogger } from '@jupiterone/integration-sdk-testing';
import { DeviceConfigurationDeviceStatus } from '@microsoft/microsoft-graph-types-beta';

import {
  CLOSED_DEVICE_STATUSES,
  findingIsOpen,
  OPEN_DEVICE_STATUSES,
} from './utils';

const logger = createMockIntegrationLogger();

describe('findingIsOpen', () => {
  CLOSED_DEVICE_STATUSES.forEach((closedStatus) => {
    test(`identifies ${closedStatus} as not open`, () => {
      expect(findingIsOpen(closedStatus, logger)).toBe(false);
    });
  });

  OPEN_DEVICE_STATUSES.forEach((openStatus) => {
    test(`identifies ${openStatus} as open`, () => {
      expect(findingIsOpen(openStatus, logger)).toBe(true);
    });
  });

  test('returns `unedfined` if no deviceStatus is passed in', () => {
    expect(findingIsOpen(undefined, logger)).toBeUndefined();
  });

  test('returns `undefined` if an unknown deviceStatus is passed in', () => {
    expect(
      findingIsOpen(
        'fakeStatus' as unknown as DeviceConfigurationDeviceStatus['status'],
        logger,
      ),
    ).toBeUndefined();
  });
});
