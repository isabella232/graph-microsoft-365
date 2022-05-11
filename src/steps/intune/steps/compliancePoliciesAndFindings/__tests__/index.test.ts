import {
  createMockStepExecutionContext,
  Recording,
} from '@jupiterone/integration-sdk-testing';
import { setupAzureRecording } from '../../../../../../test/recording';
import { config } from '../../../../../../test/config';
import { fetchDevices } from '../../devices';
import { entities, relationships } from '../../../constants';
import { Entity } from '@jupiterone/integration-sdk-core';
import { isEqual } from 'lodash';
import { toArray } from '../../../../../utils/toArray';
import { fetchCompliancePolicyAndFindings } from '..';

let recording: Recording;

afterEach(async () => {
  if (recording) {
    await recording.stop();
  }
});

describe('fetchCompliancePolicyAndFindings', () => {
  test('should make entities and relationships correctly', async () => {
    recording = setupAzureRecording({
      directory: __dirname,
      name: 'fetchCompliancePolicyAndFindings',
    });
    const context = createMockStepExecutionContext({ instanceConfig: config });

    await fetchDevices(context);
    await fetchCompliancePolicyAndFindings(context);

    const compliancePolicyEntities = context.jobState.collectedEntities.filter(
      (e) => isEqual(e._class, toArray(entities.COMPLIANCE_POLICY._class)),
    );
    const noncomplianceFindingEntities =
      context.jobState.collectedEntities.filter((e) =>
        isEqual(e._class, toArray(entities.NONCOMPLIANCE_FINDING._class)),
      );
    const hostAgentCompliancePolicyRelationships =
      context.jobState.collectedRelationships.filter((r) =>
        isEqual(
          r._type,
          relationships.HOST_AGENT_ASSIGNED_COMPLIANCE_POLICY._type,
        ),
      );
    const compliancePolicyFindingRelationships =
      context.jobState.collectedRelationships.filter((r) =>
        isEqual(
          r._type,
          relationships.COMPLIANCE_POLICY_IDENTIFIED_NONCOMPLIANCE_FINDING
            ._type,
        ),
      );
    const deviceFindingRelationships =
      context.jobState.collectedRelationships.filter((r) =>
        relationships.MULTI_DEVICE_HAS_NONCOMPLIANCE_FINDING.map(
          (c) => c._type,
        ).includes(r._type),
      );

    // Check that we have Compliance Policies
    expect(compliancePolicyEntities.length).toBeGreaterThan(0);
    expect(compliancePolicyEntities).toMatchGraphObjectSchema({
      _class: entities.COMPLIANCE_POLICY._class,
    });
    expect(compliancePolicyEntities).toMatchSnapshot(
      'compliancePolicyEntities',
    );
    // Check that there are no orphaned Compliance Policies
    compliancePolicyEntities.forEach((configEntity) => {
      expect(
        hostAgentCompliancePolicyRelationships.find((r) =>
          r._key.includes(configEntity._key),
        ),
      ).toBeTruthy();
    });

    // Check that we have Noncompliance Findings
    expect(noncomplianceFindingEntities.length).toBeGreaterThan(0);
    expect(noncomplianceFindingEntities).toMatchGraphObjectSchema({
      _class: entities.NONCOMPLIANCE_FINDING._class,
    });
    expect(noncomplianceFindingEntities).toMatchSnapshot(
      'noncomplianceFindingEntities',
    );
    // Check that only open findings are created
    noncomplianceFindingEntities.forEach((entity: Entity) => {
      expect(entity.open).toBe(true);
    });

    // Check that we have DEVICE_ASSIGNED_COMPLIANCE_POLICY relationships
    expect(hostAgentCompliancePolicyRelationships.length).toBeGreaterThan(0);
    expect(
      hostAgentCompliancePolicyRelationships,
    ).toMatchDirectRelationshipSchema({});
    expect(hostAgentCompliancePolicyRelationships).toMatchSnapshot(
      'deviceCompliancePolicyRelationships',
    );

    // Check that we have COMPLIANCE_POLICY_IDENTIFIED_NONCOMPLIANCE_FINDING relationships
    expect(compliancePolicyFindingRelationships.length).toBeGreaterThan(0);
    expect(
      compliancePolicyFindingRelationships,
    ).toMatchDirectRelationshipSchema({});
    expect(compliancePolicyFindingRelationships).toMatchSnapshot(
      'noncomplianceFindingDeviceConfigurationRelationships',
    );

    // Check that we have DEVICE_HAS_NONCOMPLIANCE_FINDING relationships
    expect(deviceFindingRelationships.length).toBeGreaterThan(0);
    expect(deviceFindingRelationships).toMatchDirectRelationshipSchema({});
    expect(deviceFindingRelationships).toMatchSnapshot(
      'deviceDeviceConfigurationRelationships',
    );
  });
});
