import {
  generateRelationshipType,
  IntegrationError,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';
import { entities as activeDirectoryEntities } from '../active-directory';

export const steps = {
  FETCH_DEVICES: 'managed-devices',
  FETCH_COMPLIANCE_POLICIES_AND_FINDINGS: 'compliance-policies-and-findings',
  FETCH_DEVICE_CONFIGURATIONS_AND_FINDINGS:
    'device-configurations-and-findings',
  FETCH_MANAGED_APPLICATIONS: 'managed-applications',
  FETCH_DETECTED_APPLICATIONS: 'detected-applications',
};

export type ManagedDeviceType =
  | 'user_endpoint'
  | 'workstation'
  | 'laptop'
  | 'desktop'
  | 'computer'
  | 'server'
  | 'smartphone';
export const managedDeviceTypes: ManagedDeviceType[] = [
  'user_endpoint',
  'workstation',
  'laptop',
  'desktop',
  'computer',
  'server',
  'smartphone',
];
export const INTUNE_HOST_AGENT_KEY_PREFIX = 'intune-host-agent:';

export const entities = {
  MULTI_DEVICE: managedDeviceTypes.map((type) => {
    return {
      resourceName: 'Managed Device',
      _type: type,
      _class: ['Device', 'Host'], // Devices will not have a class of 'Device' if the device is not physical
    };
  }),
  HOST_AGENT: {
    resourceName: 'Intune Host Agent',
    _type: 'intune_host_agent',
    _class: 'HostAgent',
  },
  DEVICE_CONFIGURATION: {
    resourceName: 'Device Configuration',
    _type: 'intune_device_configuration',
    _class: ['Configuration', 'ControlPolicy'] as string[],
  },
  COMPLIANCE_POLICY: {
    resourceName: 'Compliance Policy',
    _type: 'intune_compliance_policy',
    _class: ['Configuration', 'ControlPolicy'] as string[],
  },
  NONCOMPLIANCE_FINDING: {
    resourceName: 'Noncompliance Finding',
    _type: 'intune_noncompliance_finding',
    _class: 'Finding',
  },
  MANAGED_APPLICATION: {
    resourceName: 'Managed Application',
    _type: 'intune_managed_application',
    _class: 'Application',
  },
  DETECTED_APPLICATION: {
    resourceName: 'Detected Application',
    _type: 'intune_detected_application',
    _class: 'Application',
  },
} as const;

function createRelationshipForAllDeviceTypes(relationshipMetadata: {
  sourceType?: string;
  targetType?: string;
  _class: RelationshipClass;
}) {
  const { sourceType, targetType, _class } = relationshipMetadata;
  if ((sourceType && targetType) || (!sourceType && !targetType)) {
    throw new IntegrationError({
      message: `'Invalid use of createRelationshipForAllDeviceTypes, you may have either a sourceType or a targetType'`,
      code: 'RELATIONSHIP_IMPLEMENTATION_ERROR',
    });
  }
  return managedDeviceTypes.map((type) => {
    return {
      _type: generateRelationshipType(
        _class,
        sourceType ?? type,
        targetType ?? type,
      ),
      _class,
      sourceType: sourceType ?? type,
      targetType: targetType ?? type,
    };
  });
}

export const relationships = {
  MULTI_USER_HAS_DEVICE: createRelationshipForAllDeviceTypes({
    sourceType: activeDirectoryEntities.USER._type,
    _class: RelationshipClass.HAS,
  }),
  MULTI_HOST_AGENT_MANAGES_DEVICE: createRelationshipForAllDeviceTypes({
    sourceType: entities.HOST_AGENT._type,
    _class: RelationshipClass.MANAGES,
  }),
  HOST_AGENT_ASSIGNED_DEVICE_CONFIGURATION: {
    _type: 'intune_host_agent_assigned_device_configuration',
    sourceType: entities.HOST_AGENT._type,
    _class: RelationshipClass.ASSIGNED,
    targetType: entities.DEVICE_CONFIGURATION._type,
  },
  HOST_AGENT_ASSIGNED_COMPLIANCE_POLICY: {
    _type: 'intune_host_agent_assigned_compliance_policy',
    sourceType: entities.HOST_AGENT._type,
    _class: RelationshipClass.ASSIGNED,
    targetType: entities.COMPLIANCE_POLICY._type,
  },
  DEVICE_CONFIGURATION_IDENTIFIED_NONCOMPLIANCE_FINDING: {
    _type: 'intune_device_configuration_identified_noncompliance_finding',
    sourceType: entities.DEVICE_CONFIGURATION._type,
    _class: RelationshipClass.IDENTIFIED,
    targetType: entities.NONCOMPLIANCE_FINDING._type,
  },
  COMPLIANCE_POLICY_IDENTIFIED_NONCOMPLIANCE_FINDING: {
    _type: 'intune_compliance_policy_identified_noncompliance_finding',
    sourceType: entities.COMPLIANCE_POLICY._type,
    _class: RelationshipClass.IDENTIFIED,
    targetType: entities.NONCOMPLIANCE_FINDING._type,
  },
  MULTI_DEVICE_HAS_NONCOMPLIANCE_FINDING: createRelationshipForAllDeviceTypes({
    targetType: entities.NONCOMPLIANCE_FINDING._type,
    _class: RelationshipClass.HAS,
  }),
  MULTI_DEVICE_ASSIGNED_MANAGED_APPLICATION: createRelationshipForAllDeviceTypes(
    {
      targetType: entities.MANAGED_APPLICATION._type,
      _class: RelationshipClass.ASSIGNED,
    },
  ),
  MULTI_DEVICE_INSTALLED_DETECTED_APPLICATION: createRelationshipForAllDeviceTypes(
    {
      targetType: entities.DETECTED_APPLICATION._type,
      _class: RelationshipClass.INSTALLED,
    },
  ),
  MANAGED_APPLICATION_MANAGES_DETECTED_APPLICATION: {
    _type: 'intune_managed_application_manages_detected_application',
    sourceType: entities.MANAGED_APPLICATION._type,
    _class: RelationshipClass.MANAGES,
    targetType: entities.DETECTED_APPLICATION._type,
  },
} as const;
