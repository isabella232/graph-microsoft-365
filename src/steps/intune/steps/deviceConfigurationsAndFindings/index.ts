import {
  Step,
  IntegrationStepExecutionContext,
  createDirectRelationship,
  Entity,
  JobState,
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
  createDeviceConfigurationEntity,
} from './converters';
import { last } from 'lodash';
import {
  deviceIsRelatedToConfig,
  findingIsOpen,
  UNRELATED_DEVICE_STATUSES,
} from '../../utils';
import { DeviceConfiguration } from '@microsoft/microsoft-graph-types-beta';

export async function fetchDeviceConfigurationsAndFindings(
  executionContext: IntegrationStepContext,
): Promise<void> {
  const { logger, instance, jobState } = executionContext;
  const intuneClient = new DeviceManagementIntuneClient(
    logger,
    instance.config,
  );
  await intuneClient.iterateDeviceConfigurations(
    async (deviceConfiguration) => {
      await intuneClient.iterateDeviceConfigurationDeviceStatuses(
        deviceConfiguration.id as string,
        async (deviceStatus) => {
          const deviceId = last(deviceStatus.id?.split('_')); // Microsoft hid the device id in this way
          const deviceEntity = await jobState.findEntity(deviceId);
          const hostAgentEntity = await jobState.findEntity(
            INTUNE_HOST_AGENT_KEY_PREFIX + deviceId,
          );

          if (!hostAgentEntity) {
            logger.warn(
              { deviceId, deviceStatus },
              'Error creating HostAgent -> DeviceConfiguration relationship: hostAgentEntity does not exist',
            );
          } else if (!deviceEntity) {
            logger.warn(
              { deviceId, deviceStatus },
              'Error creating HostAgent -> DeviceConfiguration relationship: deviceEntity does not exist',
            );
          } else if (deviceIsRelatedToConfig(deviceStatus.status)) {
            // Only once we know the configuration is attached to a device do we add it to the jobstate
            const deviceConfigurationEntity = await findOrCreateDeviceConfigurationEntity(
              deviceConfiguration,
              jobState,
            );

            const hostAssignedDeviceKey =
              deviceStatus.id! +
              '|' +
              hostAgentEntity._key +
              '|' +
              deviceConfigurationEntity._key;

            if (await jobState.hasKey(hostAssignedDeviceKey)) {
              logger.warn(
                {
                  deviceStatusId: deviceStatus.id,
                  hostAssignedDeviceKey,
                },
                'Possible duplicate hostAssignedDeviceKey',
              );
            } else {
              await jobState.addRelationship(
                createDirectRelationship({
                  _class:
                    relationships.HOST_AGENT_ASSIGNED_DEVICE_CONFIGURATION
                      ._class,
                  from: hostAgentEntity,
                  to: deviceConfigurationEntity,
                  properties: {
                    _key: hostAssignedDeviceKey,
                    complianceStatus: deviceStatus.status,
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
                  'Possible duplicate deviceConfigurationDeviceStatus',
                );
              } else {
                const noncomplianceFindingEntity = createNoncomplianceFindingEntity(
                  deviceStatus,
                  deviceConfigurationEntity,
                  logger,
                );
                await jobState.addEntity(noncomplianceFindingEntity);
                await jobState.addRelationship(
                  createDirectRelationship({
                    _class:
                      relationships
                        .DEVICE_CONFIGURATION_IDENTIFIED_NONCOMPLIANCE_FINDING
                        ._class,
                    from: deviceConfigurationEntity,
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
    },
  );
}

async function findOrCreateDeviceConfigurationEntity(
  deviceConfiguration: DeviceConfiguration,
  jobState: JobState,
): Promise<Entity> {
  let deviceConfigurationEntity =
    deviceConfiguration.id &&
    (await jobState.findEntity(deviceConfiguration.id));

  if (!deviceConfigurationEntity) {
    deviceConfigurationEntity = createDeviceConfigurationEntity(
      deviceConfiguration,
    );
    await jobState.addEntity(deviceConfigurationEntity);
  }
  return deviceConfigurationEntity;
}

export const deviceConfigurationAndFindingsSteps: Step<
  IntegrationStepExecutionContext<IntegrationConfig>
>[] = [
  {
    id: steps.FETCH_DEVICE_CONFIGURATIONS_AND_FINDINGS,
    name: 'Device Configurations and Related Findings',
    entities: [entities.DEVICE_CONFIGURATION, entities.NONCOMPLIANCE_FINDING],
    relationships: [
      relationships.HOST_AGENT_ASSIGNED_DEVICE_CONFIGURATION,
      relationships.DEVICE_CONFIGURATION_IDENTIFIED_NONCOMPLIANCE_FINDING,
      ...relationships.MULTI_DEVICE_HAS_NONCOMPLIANCE_FINDING,
    ],
    dependsOn: [steps.FETCH_DEVICES],
    executionHandler: fetchDeviceConfigurationsAndFindings,
  },
];
