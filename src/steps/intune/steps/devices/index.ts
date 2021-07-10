import {
  createDirectRelationship,
  IntegrationStepExecutionContext,
  Step,
} from '@jupiterone/integration-sdk-core';
import { IntegrationConfig, IntegrationStepContext } from '../../../../types';
import { steps as activeDirectorySteps } from '../../../active-directory';
import { DeviceManagementIntuneClient } from '../../clients/deviceManagementIntuneClient';
import { relationships, entities, steps } from '../../constants';
import {
  createManagedDeviceEntity,
  createIntuneHostAgentEntity,
  createUserDeviceMappedRelationship,
} from './converters';

/**
 * Intune ManagedDevices are componsed of a physical or virtual device plus the Intune host agent.
 * This agent allows users to apply configurations and policies to their managed devices. These
 * need to be modeled as seperate entities as devices may be shared between multiple integrations
 * where the Intune host agent is unique to this integration.
 */
export async function fetchDevices(
  executionContext: IntegrationStepContext,
): Promise<void> {
  const { logger, instance, jobState } = executionContext;
  const intuneClient = new DeviceManagementIntuneClient(
    logger,
    instance.config,
  );

  await intuneClient.iterateManagedDevices(async (device) => {
    const deviceEntity = createManagedDeviceEntity(device);
    await jobState.addEntity(deviceEntity);
    const userEntity = await jobState.findEntity(device.userId as string);
    const userDeviceRelationship = userEntity
      ? createDirectRelationship({
          _class: relationships.MULTI_USER_HAS_DEVICE[0]._class,
          from: userEntity,
          to: deviceEntity,
        })
      : createUserDeviceMappedRelationship(
          deviceEntity,
          device.userId as string,
          device.emailAddress as string,
        );
    if (userDeviceRelationship) {
      await jobState.addRelationship(userDeviceRelationship);
    }

    // Create and relate Intune Host Agent based on Managed Device
    const hostAgentEntity = createIntuneHostAgentEntity(device);
    await jobState.addEntity(hostAgentEntity);
    const deviceHostAgentRelationship = createDirectRelationship({
      _class: relationships.MULTI_HOST_AGENT_MANAGES_DEVICE[0]._class,
      from: hostAgentEntity,
      to: deviceEntity,
    });
    await jobState.addRelationship(deviceHostAgentRelationship);
  });
}

export const deviceSteps: Step<
  IntegrationStepExecutionContext<IntegrationConfig>
>[] = [
  {
    id: steps.FETCH_DEVICES,
    name: 'Managed Devices',
    entities: [...entities.MULTI_DEVICE, entities.HOST_AGENT],
    relationships: [
      ...relationships.MULTI_USER_HAS_DEVICE,
      ...relationships.MULTI_HOST_AGENT_MANAGES_DEVICE,
    ],
    dependsOn: [activeDirectorySteps.FETCH_USERS],
    executionHandler: fetchDevices,
  },
];
