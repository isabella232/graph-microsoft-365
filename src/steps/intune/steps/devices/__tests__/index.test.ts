import {
  createMockStepExecutionContext,
  Recording,
} from '@jupiterone/integration-sdk-testing';
import { setupAzureRecording } from '../../../../../../test/recording';
import { config } from '../../../../../../test/config';
import { buildDeviceHostAgentRelationships, fetchDevices } from '..';
import { entities, managedDeviceTypes } from '../../../constants';
import { DATA_ACCOUNT_ENTITY, fetchUsers } from '../../../../active-directory';
import { entities as activeDirectoryEntities } from '../../../../active-directory';
import { createAccountEntity } from '../../../../active-directory/converters';

let recording: Recording;

afterEach(async () => {
  if (recording) {
    await recording.stop();
  }
});

describe('fetchDevices', () => {
  test('Without Active Directory', async () => {
    recording = setupAzureRecording({
      directory: __dirname,
      name: 'iterateManagedDevicesNoAD',
    });
    const context = createMockStepExecutionContext({ instanceConfig: config });

    await fetchDevices(context);
    await buildDeviceHostAgentRelationships(context);

    const managedDevices = context.jobState.collectedEntities.filter((e) =>
      e._class.includes('Host'),
    );
    const hostAgents = context.jobState.collectedEntities.filter((e) =>
      e._class.includes('HostAgent'),
    );
    const managedDeviceRelationships = context.jobState.collectedRelationships.filter(
      (r) => managedDeviceTypes.some((type) => r._type.includes(type)),
    );
    const userRelationships = managedDeviceRelationships.filter((r) =>
      r._type.includes(activeDirectoryEntities.USER._type),
    );
    const nonUserRelationships = managedDeviceRelationships.filter(
      (r) => !r._type.includes(activeDirectoryEntities.USER._type),
    );

    // Check that we have devices
    expect(managedDevices.length).toBeGreaterThan(0);
    expect(managedDevices.filter((d) => d.physical)).toMatchGraphObjectSchema({
      _class: ['Host', 'Device'],
    });
    expect(managedDevices.filter((d) => !d.physical)).toMatchGraphObjectSchema({
      _class: ['Host'],
    });
    expect(managedDevices).toMatchSnapshot('managedDevices'); // intentionally the same snapshot as in the 'With Active Directory' test below

    // Check that we have as many host agents as we have managed devices
    expect(hostAgents.length).toBe(managedDevices.length);
    expect(hostAgents).toMatchGraphObjectSchema({
      _class: entities.HOST_AGENT._class,
    });
    expect(hostAgents).toMatchSnapshot('hostAgents'); // intentionally the same snapshot as in the 'With Active Directory' test below

    // Check that user relationships are mapped
    expect(userRelationships.length).toBeGreaterThan(0);
    userRelationships.forEach((r) =>
      expect(r).toMatchObject({
        _mapping: expect.any(Object),
      }),
    );
    // Check that the remaining relationships are with host agents
    expect(nonUserRelationships.length).toBeGreaterThan(0);
    nonUserRelationships.forEach((r) =>
      expect(r).toMatchObject({
        _type: expect.stringMatching(new RegExp(entities.HOST_AGENT._type)),
      }),
    );

    expect(managedDeviceRelationships).toMatchSnapshot(
      'managedDeviceRelationshipsNoAD',
    );
  });

  test('With Active Directory', async () => {
    recording = setupAzureRecording({
      directory: __dirname,
      name: 'iterateManagedDevicesWithAD',
    });
    const context = createMockStepExecutionContext({ instanceConfig: config });

    await context.jobState.setData(
      DATA_ACCOUNT_ENTITY,
      createAccountEntity(context.instance),
    );
    await fetchUsers(context);
    await fetchDevices(context);
    await buildDeviceHostAgentRelationships(context);

    const managedDevices = context.jobState.collectedEntities.filter((e) =>
      e._class.includes('Host'),
    );
    const hostAgents = context.jobState.collectedEntities.filter((e) =>
      e._class.includes('HostAgent'),
    );
    const managedDeviceRelationships = context.jobState.collectedRelationships.filter(
      (r) => managedDeviceTypes.some((type) => r._type.includes(type)),
    );
    const userRelationships = managedDeviceRelationships.filter((r) =>
      r._type.includes(activeDirectoryEntities.USER._type),
    );
    const nonUserRelationships = managedDeviceRelationships.filter(
      (r) => !r._type.includes(activeDirectoryEntities.USER._type),
    );

    // Check that we have devices
    expect(managedDevices.length).toBeGreaterThan(0);
    expect(managedDevices.filter((d) => d.physical)).toMatchGraphObjectSchema({
      _class: ['Host', 'Device'],
    });
    expect(managedDevices.filter((d) => !d.physical)).toMatchGraphObjectSchema({
      _class: ['Host'],
    });
    expect(managedDevices).toMatchSnapshot('managedDevices'); // intentionally the same snapshot as in the 'Without Active Directory' test above

    // Check that we have as many host agents as we have managed devices
    expect(hostAgents.length).toBe(managedDevices.length);
    expect(hostAgents).toMatchGraphObjectSchema({
      _class: entities.HOST_AGENT._class,
    });
    expect(hostAgents).toMatchSnapshot('hostAgents'); // intentionally the same snapshot as in the 'Without Active Directory' test above

    // Check that user relationships are direct
    expect(userRelationships.length).toBeGreaterThan(0);
    expect(userRelationships).toMatchDirectRelationshipSchema({});
    // Check that the remaining relationships are with host agents
    expect(nonUserRelationships.length).toBeGreaterThan(0);
    nonUserRelationships.forEach((r) =>
      expect(r).toMatchObject({
        _type: expect.stringMatching(new RegExp(entities.HOST_AGENT._type)),
      }),
    );

    expect(managedDeviceRelationships).toMatchSnapshot(
      'managedDeviceRelationshipsWithAD',
    );
  });
});
