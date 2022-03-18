import {
  createIntegrationEntity,
  Entity,
  IntegrationLogger,
  parseTimePropertyValue,
} from '@jupiterone/integration-sdk-core';
import {
  DeviceConfiguration,
  DeviceConfigurationDeviceStatus,
} from '@microsoft/microsoft-graph-types-beta';
import { entities } from '../../constants';
import {
  calculateSeverity,
  calculateNumericSeverity,
  findingIsOpen,
} from '../../utils';
import { last } from 'lodash';

/**
 * There are several different types of device configurations based on your OS and what you are configuring.
 * So many that it does not make sense to ingest each individually until that granularity is desired
 * or necessary. Because of that, this method ingests all device configurations the same way, and if
 * more granularity is desired, individual configuration settings can be viewed in the raw data.
 *
 * https://docs.microsoft.com/en-us/graph/api/resources/intune-shared-deviceconfiguration?view=graph-rest-beta
 */
export function createDeviceConfigurationEntity(
  deviceConfiguration: DeviceConfiguration,
): Entity {
  return createIntegrationEntity({
    entityData: {
      source: deviceConfiguration,
      assign: {
        _key: deviceConfiguration.id!,
        _class: entities.DEVICE_CONFIGURATION._class,
        _type: entities.DEVICE_CONFIGURATION._type,
        function: 'endpoint-configuration', // needed to match up with existing integrations data structures.
        category: 'config',
        id: deviceConfiguration.id,
        name: deviceConfiguration.displayName,
        description:
          deviceConfiguration.description || deviceConfiguration.displayName,
        createdOn: parseTimePropertyValue(deviceConfiguration.createdDateTime),
        displayName: deviceConfiguration.displayName,
        version: deviceConfiguration.version,
        /**
         * Possible values (There are many of them): https://docs.microsoft.com/en-us/graph/api/resources/intune-device-cfg-conceptual?view=graph-rest-beta
         * examples: iosCustomConfiguration, windows10GeneralConfiguration, iosWiFiConfiguration
         */
        configurationType: last(deviceConfiguration['@odata.type']?.split('.')),
      },
    },
  });
}

// https://docs.microsoft.com/en-us/graph/api/resources/intune-deviceconfig-deviceconfigurationdevicestatus?view=graph-rest-beta
export function createNoncomplianceFindingEntity(
  deviceStatus: DeviceConfigurationDeviceStatus,
  deviceConfigurationEntity: Entity,
  logger: IntegrationLogger,
): Entity {
  return createIntegrationEntity({
    entityData: {
      source: deviceStatus,
      assign: {
        _key: deviceStatus.id!,
        _class: entities.NONCOMPLIANCE_FINDING._class,
        _type: entities.NONCOMPLIANCE_FINDING._type,
        id: deviceStatus.id,
        name: 'Latest finding from ' + deviceConfigurationEntity.displayName,
        category: 'endpoint',
        assessment: deviceConfigurationEntity.displayName,
        status: deviceStatus.status, // Possible values are: unknown, notApplicable, compliant, remediated, nonCompliant, error, conflict, notAssigned.
        severity: calculateSeverity(deviceStatus.status, logger),
        numericSeverity: calculateNumericSeverity(deviceStatus.status, logger),
        open: findingIsOpen(deviceStatus.status, logger),
        lastProcessedOn: parseTimePropertyValue(
          deviceStatus.lastReportedDateTime,
        ),
        lastTestedOn: parseTimePropertyValue(deviceStatus.lastReportedDateTime),
        lastUpdatedOn: parseTimePropertyValue(
          deviceStatus.lastReportedDateTime,
        ),
      },
    },
  });
}
