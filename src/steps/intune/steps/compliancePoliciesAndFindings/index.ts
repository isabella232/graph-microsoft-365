import {
  Step,
  IntegrationStepExecutionContext,
  createDirectRelationship,
  Entity,
  JobState,
  generateRelationshipKey,
} from '@jupiterone/integration-sdk-core';
import { IntegrationConfig, IntegrationStepContext } from '../../../../types';
import { DeviceManagementIntuneClient } from '../../clients/deviceManagementIntuneClient';
import {
  entities,
  INTUNE_HOST_AGENT_KEY_PREFIX,
  relationships,
  steps,
} from '../../constants';
import {
  createNoncomplianceFindingEntity,
  createCompliancePolicyEntity,
} from './converters';
import { last } from 'lodash';
import { DeviceCompliancePolicy } from '@microsoft/microsoft-graph-types-beta';
import {
  deviceIsRelatedToConfig,
  findingIsOpen,
  UNRELATED_DEVICE_STATUSES,
} from '../../utils';

export async function fetchCompliancePolicyAndFindings(
  executionContext: IntegrationStepContext,
): Promise<void> {
  const { logger, instance, jobState } = executionContext;
  const intuneClient = new DeviceManagementIntuneClient(
    logger,
    instance.config,
  );
  await intuneClient.iterateCompliancePolicies(async (compliancePolicy) => {
    await intuneClient.iterateCompliancePolicyDeviceStatuses(
      compliancePolicy.id as string,
      async (deviceStatus) => {
        const deviceId = last(deviceStatus.id?.split('_')); // Microsoft hid the device id in this way
        const deviceEntity = await jobState.findEntity(deviceId);
        const hostAgentEntity = await jobState.findEntity(
          INTUNE_HOST_AGENT_KEY_PREFIX + deviceId,
        );

        if (!hostAgentEntity) {
          logger.warn(
            { deviceId, deviceStatus },
            'Error creating HostAgent -> CompliancePolicy relationship: hostAgentEntity does not exist',
          );
        } else if (!deviceEntity) {
          logger.warn(
            { deviceId, deviceStatus },
            'Error creating HostAgent -> CompliancePolicy relationship: deviceEntity does not exist',
          );
        } else if (deviceIsRelatedToConfig(deviceStatus.status)) {
          // Only once we know the policy is attached to a device do we add it to the jobstate
          const compliancePolicyEntity = await findOrCreateCompliancePolicyEntity(
            compliancePolicy,
            jobState,
          );

          const hostAgentAssignedCompliancePolicyKey = generateRelationshipKey(
            relationships.HOST_AGENT_ASSIGNED_COMPLIANCE_POLICY._class,
            hostAgentEntity,
            compliancePolicyEntity,
          );

          if (await jobState.hasKey(hostAgentAssignedCompliancePolicyKey)) {
            logger.warn(
              {
                deviceStatusId: deviceStatus.id,
                hostAgentKey: hostAgentEntity.id,
                compliancePolicyKey: compliancePolicyEntity._key,
                hostAgentAssignedCompliancePolicyKey,
              },
              'Possible duplicate hostAgentAssignedCompliancePolicyKey',
            );
          } else {
            await jobState.addRelationship(
              createDirectRelationship({
                _class:
                  relationships.HOST_AGENT_ASSIGNED_COMPLIANCE_POLICY._class,
                from: hostAgentEntity,
                to: compliancePolicyEntity,
                properties: {
                  complianceStatus: deviceStatus.status, // Possible values are: unknown, notApplicable, compliant, remediated, nonCompliant, error, conflict, notAssigned.
                  compliant: [
                    ...UNRELATED_DEVICE_STATUSES,
                    'unknown',
                    undefined,
                  ].includes(deviceStatus.status)
                    ? undefined
                    : deviceStatus.status === 'compliant',
                },
              }),
            );
          }

          // Only create findings if they are open
          if (findingIsOpen(deviceStatus.status, logger) !== false) {
            const noncomplianceFindingKey = deviceStatus.id;
            if (await jobState.hasKey(noncomplianceFindingKey!)) {
              logger.warn(
                {
                  deviceStatusId: deviceStatus.id,
                },
                'Possible duplicate compliancePolicyDeviceStatus',
              );
            } else {
              const noncomplianceFindingEntity = createNoncomplianceFindingEntity(
                deviceStatus,
                compliancePolicyEntity,
                logger,
              );
              await jobState.addEntity(noncomplianceFindingEntity);
              await jobState.addRelationship(
                createDirectRelationship({
                  _class:
                    relationships
                      .COMPLIANCE_POLICY_IDENTIFIED_NONCOMPLIANCE_FINDING
                      ._class,
                  from: compliancePolicyEntity,
                  to: noncomplianceFindingEntity,
                }),
              );
              await jobState.addRelationship(
                createDirectRelationship({
                  _class:
                    relationships.MULTI_DEVICE_HAS_NONCOMPLIANCE_FINDING[0]
                      ._class,
                  from: deviceEntity,
                  to: noncomplianceFindingEntity,
                }),
              );
            }
          }
        }
      },
    );
  });
}

async function findOrCreateCompliancePolicyEntity(
  compliancePolicy: DeviceCompliancePolicy,
  jobState: JobState,
): Promise<Entity> {
  let compliancePolicyEntity =
    compliancePolicy.id && (await jobState.findEntity(compliancePolicy.id));

  if (!compliancePolicyEntity) {
    compliancePolicyEntity = createCompliancePolicyEntity(compliancePolicy);
    await jobState.addEntity(compliancePolicyEntity);
  }
  return compliancePolicyEntity;
}

export const compliancePolicyAndFindingsSteps: Step<
  IntegrationStepExecutionContext<IntegrationConfig>
>[] = [
  {
    id: steps.FETCH_COMPLIANCE_POLICIES_AND_FINDINGS,
    name: 'Compliance Policies and Related Findings',
    entities: [entities.COMPLIANCE_POLICY, entities.NONCOMPLIANCE_FINDING],
    relationships: [
      relationships.HOST_AGENT_ASSIGNED_COMPLIANCE_POLICY,
      relationships.COMPLIANCE_POLICY_IDENTIFIED_NONCOMPLIANCE_FINDING,
      ...relationships.MULTI_DEVICE_HAS_NONCOMPLIANCE_FINDING,
    ],
    dependsOn: [steps.FETCH_DEVICES],
    executionHandler: fetchCompliancePolicyAndFindings,
  },
];
