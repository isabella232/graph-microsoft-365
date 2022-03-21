import {
  createIntegrationEntity,
  Entity,
  IntegrationLogger,
  parseTimePropertyValue,
} from '@jupiterone/integration-sdk-core';
import {
  DeviceCompliancePolicy,
  DeviceConfigurationDeviceStatus,
} from '@microsoft/microsoft-graph-types-beta';
import { entities } from '../../constants';
import { last } from 'lodash';
import {
  calculateSeverity,
  calculateNumericSeverity,
  findingIsOpen,
} from '../../utils';

/**
 * There are several different types of compliance policies based on your OS and what you are configuring.
 * So many that it does not make sense to ingest each individually until that granularity is desired
 * or necessary. Because of that, this method ingests all compliance policies the same way, and if
 * more granularity is desired, individual configuration settings can be viewed in the raw data.
 *
 * https://docs.microsoft.com/en-us/graph/api/resources/intune-shared-devicecompliancepolicy?view=graph-rest-beta
 */
export function createCompliancePolicyEntity(
  compliancePolicy: DeviceCompliancePolicy,
): Entity {
  return createIntegrationEntity({
    entityData: {
      source: {},
      assign: {
        _key: compliancePolicy.id!,
        _class: entities.COMPLIANCE_POLICY._class,
        _type: entities.COMPLIANCE_POLICY._type,
        function: 'endpoint-compliance', // needed to match up with existing integrations data structures.
        category: 'compliance', // needed for "ControlPolicy"
        id: compliancePolicy.id,
        name: compliancePolicy.displayName,
        description:
          compliancePolicy.description || compliancePolicy.displayName,
        createdOn: parseTimePropertyValue(compliancePolicy.createdDateTime),
        displayName: compliancePolicy.displayName,
        version: compliancePolicy.version,
        policyType: last(compliancePolicy['@odata.type']?.split('.')), // Possible values: 'iosCompliancePolicy'
      },
    },
  });
}

// https://docs.microsoft.com/en-us/graph/api/resources/intune-deviceconfig-deviceconfigurationdevicestatus?view=graph-rest-beta
export function createNoncomplianceFindingEntity(
  deviceStatus: DeviceConfigurationDeviceStatus,
  compliancePolicyEntity: Entity,
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
        name: 'Latest finding from ' + compliancePolicyEntity.displayName,
        category: 'endpoint',
        assessment: compliancePolicyEntity.displayName,
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
