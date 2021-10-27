import {
  IntegrationInvocationConfig,
  IntegrationStepExecutionContext,
  RelationshipClass,
  RelationshipDirection,
  Step,
} from '@jupiterone/integration-sdk-core';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const executionHandler = () => {};

export const invocationConfig: IntegrationInvocationConfig = {
  integrationSteps: [
    /**
     * ENDPOINT: n/a
     * PATTERN: Singleton
     */
    {
      id: 'create-account',
      name: 'Create Account',
      entities: [
        {
          resourceName: 'Account',
          _class: 'Account',
          _type: 'intune_account',
        },
      ],
      relationships: [],
      mappedRelationships: [
        {
          _type: 'microsoft_tenant_has_intune_account',
          sourceType: 'intune_account',
          _class: RelationshipClass.HAS,
          targetType: 'microsoft_tenant',
          direction: RelationshipDirection.REVERSE,
        },
      ],
      dependsOn: [],
      executionHandler,
    } as Step<IntegrationStepExecutionContext>,
    /**
     * ENDPOINT: '/deviceManagement/managedDevices',
     * PATTERN: Fetch Entitites,
     */
    {
      id: 'fetch-managed-devices',
      name: 'Fetch Managed Devices',
      entities: [
        {
          resourceName: 'Device',
          _class: 'Device',
          _type: 'intune_device',
        },
      ],
      relationships: [
        {
          _type: 'intune_account_has_device',
          sourceType: 'intune_account',
          _class: RelationshipClass.HAS,
          targetType: 'intune_device',
        },
      ],
      dependsOn: ['create-account'],
      executionHandler,
    },
    /**
     * ENDPOINT: '/deviceManagement/deviceCompliancePolicies',
     * PATTERN: Fetch Entitites,
     */
    {
      id: 'fetch-compliance-policies',
      name: 'Fetch Compliance Policies',
      entities: [
        {
          resourceName: 'Compliance Policy',
          _class: ['Configuration', 'ControlPolicy'],
          _type: 'intune_compliance_policy',
        },
      ],
      relationships: [
        {
          _type: 'intune_account_has_compliance_policy',
          sourceType: 'intune_account',
          _class: RelationshipClass.HAS,
          targetType: 'intune_compliance_policy',
        },
      ],
      dependsOn: ['create-account'],
      executionHandler,
    },
    /**
     * ENDPOINT: '/deviceManagement/deviceConfigurations',
     * PATTERN: Fetch Entitites,
     */
    {
      id: 'fetch-device-configurations',
      name: 'Fetch Device Configurations',
      entities: [
        {
          resourceName: 'Device Confguration',
          _class: ['Configuration', 'ControlPolicy'],
          _type: 'intune_device_configuration',
        },
      ],
      relationships: [
        {
          _type: 'intune_account_has_device_configuration',
          sourceType: 'intune_account',
          _class: RelationshipClass.HAS,
          targetType: 'intune_device_configuration',
        },
      ],
      dependsOn: ['create-account'],
      executionHandler,
    },
    /**
     * ENDPOINT: '/deviceManagement/managedDevices/{deviceId}/deviceCompliancePolicyStates',
     * PATTERN: Fetch Child Entitites,
     */
    {
      id: 'fetch-compliance-policy-states',
      name: 'Fetch Compliance Policy States',
      entities: [
        {
          resourceName: 'Compliance Policy State',
          _class: ['Finding'],
          _type: 'intune_compliance_policy_state',
        },
      ],
      relationships: [
        {
          _type: 'intune_device_has_compliance_policy_state',
          sourceType: 'intune_device',
          _class: RelationshipClass.HAS,
          targetType: 'intune_compliance_policy_state',
        },
        {
          _type: 'intune_compliance_policy_identified_state',
          sourceType: 'intune_compliance_policy',
          _class: RelationshipClass.IDENTIFIED,
          targetType: 'intune_compliance_policy_state',
        },
      ],
      executionHandler,
    },
    /**
     * ENDPOINT: '/deviceManagement/managedDevices/{deviceId}/deviceConfigurationStates',
     * PATTERN: Fetch Child Entitites,
     */
    {
      id: 'fetch-device-configuration-states',
      name: 'Fetch Device Configuration States',
      entities: [
        {
          resourceName: 'Device Configuration State',
          _class: ['Finding'],
          _type: 'intune_device_configuration_state',
        },
      ],
      relationships: [
        {
          _type: 'intune_device_has_configuration_state',
          sourceType: 'intune_device',
          _class: RelationshipClass.HAS,
          targetType: 'intune_device_configuration_state',
        },
        {
          _type: 'intune_device_configuration_identified_state',
          sourceType: 'intune_device_configuration',
          _class: RelationshipClass.IDENTIFIED,
          targetType: 'intune_device_configuration_state',
        },
      ],
      executionHandler,
    },
  ],
};
