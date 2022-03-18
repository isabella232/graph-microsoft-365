import { DeviceConfigurationDeviceStatus } from '@microsoft/microsoft-graph-types-beta';

export const exampleDeviceStatus: DeviceConfigurationDeviceStatus = {
  id: '7b521133-f056-40a9-b639-b76afd67e4bb_6aa605f0-744e-4ae1-8031-c6564624c89b_683dbff1-c8ff-4996-91ae-85484de46cfc',
  deviceDisplayName: 'Person’s iPhone',
  userName: 'dude.person@email.onmicrosoft.com',
  deviceModel: null,
  platform: 0,
  complianceGracePeriodExpirationDateTime: '2021-02-17T19:13:41.8113Z',
  status: 'error',
  lastReportedDateTime: '2021-03-01T12:20:19.1406851Z',
  userPrincipalName: 'dude.person@email.onmicrosoft.com',
};
