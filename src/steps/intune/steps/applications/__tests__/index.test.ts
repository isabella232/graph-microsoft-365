import {
  createMockStepExecutionContext,
  Recording,
} from '@jupiterone/integration-sdk-testing';
import { setupAzureRecording } from '../../../../../../test/recording';
import { config } from '../../../../../../test/config';
import { fetchDevices } from '../../devices';
import { entities, relationships } from '../../../constants';
import { isEqual } from 'lodash';
import { toArray } from '../../../../../utils/toArray';
import { fetchDetectedApplications, fetchManagedApplications } from '..';
import { groupBy, sortBy, last, uniq } from 'lodash';

let recording: Recording;

afterEach(async () => {
  if (recording) {
    await recording.stop();
  }
});

describe('fetchManagedApplications', () => {
  test('should make entities and relationships correctly', async () => {
    recording = setupAzureRecording({
      directory: __dirname,
      name: 'fetchManagedApplications',
    });
    const context = createMockStepExecutionContext({ instanceConfig: config });

    await fetchDevices(context);
    await fetchManagedApplications(context);

    const managedApplicationEntities =
      context.jobState.collectedEntities.filter((e) =>
        isEqual(e._class, toArray(entities.MANAGED_APPLICATION._class)),
      );
    const deviceApplicationRelationships =
      context.jobState.collectedRelationships.filter((r) =>
        relationships.MULTI_DEVICE_ASSIGNED_MANAGED_APPLICATION.map(
          (c) => c._type,
        ).includes(r._type),
      );

    // Check that we have Managed Applications
    expect(managedApplicationEntities.length).toBeGreaterThan(0);
    expect(managedApplicationEntities).toMatchGraphObjectSchema({
      _class: entities.MANAGED_APPLICATION._class,
    });
    expect(managedApplicationEntities).toMatchSnapshot(
      'managedApplicationEntities',
    );

    // Check that we have DEVICE_ASSIGNED_MANAGED_APPLICATION relationships
    expect(deviceApplicationRelationships.length).toBeGreaterThan(0);
    expect(deviceApplicationRelationships).toMatchDirectRelationshipSchema({});
    expect(deviceApplicationRelationships).toMatchSnapshot(
      'deviceManagedApplicationRelationships',
    );
  });
});

const exampleManagedApplicationEntity = {
  _class: ['Application'],
  _type: 'intune_managed_application',
  _key: 'IntuneManaged:microsoft word',
  name: 'microsoft word',
  id: '00000000-0000-0000-0000-000000000000',
};

describe('fetchDetectedApplications', () => {
  test('should make entities and relationships correctly', async () => {
    recording = setupAzureRecording({
      directory: __dirname,
      name: 'fetchDetectedApplications',
    });
    const context = createMockStepExecutionContext({
      instanceConfig: config,
      entities: [exampleManagedApplicationEntity],
    });

    await fetchDevices(context);
    await fetchDetectedApplications(context);

    const detectedApplicationEntities =
      context.jobState.collectedEntities.filter(
        (e) => e._type === entities.DETECTED_APPLICATION._type,
      );
    const deviceDetectedApplicationRelationships =
      context.jobState.collectedRelationships.filter((r) =>
        relationships.MULTI_DEVICE_INSTALLED_DETECTED_APPLICATION.map(
          (c) => c._type,
        ).includes(r._type),
      );

    // Check that we have Detected Applications
    expect(detectedApplicationEntities.length).toBeGreaterThan(0);
    expect(detectedApplicationEntities).toMatchGraphObjectSchema({
      _class: entities.DETECTED_APPLICATION._class,
    });
    expect(detectedApplicationEntities).toMatchSnapshot(
      'detectedApplicationEntities',
    );

    // TODO add managed application -> detected appliation relationship
    // const managedAppDetectedAppRelationships = context.jobState.collectedRelationships.filter(
    //   (r) =>
    //     relationships.MANAGED_APPLICATION_MANAGES_DETECTED_APPLICATION._type ===
    //     r._type,
    // );
    //
    // // Check that we have MANAGED_APPLICATION_MANAGES_DETECTED_APPLICATION relationships
    // expect(managedAppDetectedAppRelationships.length).toBeGreaterThan(0);
    // expect(managedAppDetectedAppRelationships).toMatchDirectRelationshipSchema(
    //   {},
    // );
    // expect(managedAppDetectedAppRelationships).toMatchSnapshot(
    //   'managedAppDetectedAppRelationships',
    // );

    // Check that we have DEVICE_ASSIGNED_DETECTED_APPLICATION relationships
    expect(deviceDetectedApplicationRelationships.length).toBeGreaterThan(0);
    expect(
      deviceDetectedApplicationRelationships,
    ).toMatchDirectRelationshipSchema({});
    expect(deviceDetectedApplicationRelationships).toMatchSnapshot(
      'deviceDetectedApplicationRelationships',
    );

    // Check that you can have multiple relationships with the same application
    const groupedRelationships = groupBy(
      deviceDetectedApplicationRelationships,
      (r) => r._key.split('|')[2],
    );
    const appWithMultipleVersions = last(
      sortBy(groupedRelationships, (c) => c.length),
    );
    expect(appWithMultipleVersions.length).toBeGreaterThan(1);

    // Check that versions do not have to be unique
    const appWithNonUniqueVersions = last(
      sortBy(
        groupedRelationships,
        (c) => c.length - uniq(c.map((d) => d.version)).length,
      ),
    );
    expect(appWithNonUniqueVersions.length).toBeGreaterThan(1);
  });
});
