import {
  createMockStepExecutionContext,
  Recording,
} from '@jupiterone/integration-sdk-testing';
import { entities, fetchAccount } from '..';
import {
  config,
  insufficientPermissionsDirectoryConfig,
  noMdmConfig,
} from '../../../../test/config';
import { setupAzureRecording } from '../../../../test/recording';

let recording: Recording;

afterEach(async () => {
  if (recording) {
    await recording.stop();
  }
});

describe('fetchAccount', () => {
  it('Should create an account entity correctly when the account has the correct permissions', async () => {
    recording = setupAzureRecording({
      directory: __dirname,
      name: 'fetchAccount',
    });
    const context = createMockStepExecutionContext({ instanceConfig: config });

    await fetchAccount(context);

    const accountEntities = context.jobState.collectedEntities;

    expect(accountEntities.length).toBe(1);
    expect(accountEntities).toMatchGraphObjectSchema({
      _class: entities.ACCOUNT._class,
    });
    expect(accountEntities).toMatchSnapshot('accountEntitiesSuccessful');
  });
  it('Should error when there are errors attempting to get organization data', () => {
    recording = setupAzureRecording({
      directory: __dirname,
      name: 'fetchAccountFail',
      options: {
        recordFailedRequests: true, // getting organization data will fail
      },
    });
    const context = createMockStepExecutionContext({
      instanceConfig: insufficientPermissionsDirectoryConfig,
    });
    expect(fetchAccount(context)).rejects;
  });

  it('Should not error and create a real account when there is no mdm authority', async () => {
    recording = setupAzureRecording({
      directory: __dirname,
      name: 'fetchAccountNoMdm',
      options: {
        recordFailedRequests: true, // getting the intune subscription will fail
        matchRequestsBy: {
          order: false,
        },
      },
    });
    const context = createMockStepExecutionContext({
      instanceConfig: noMdmConfig,
    });

    await fetchAccount(context);

    const accountEntities = context.jobState.collectedEntities;

    expect(accountEntities.length).toBe(1);
    expect(accountEntities).toMatchGraphObjectSchema({
      _class: entities.ACCOUNT._class,
    });
    expect(accountEntities).toMatchSnapshot('accountEntitiesNoMdm');
  });
});
