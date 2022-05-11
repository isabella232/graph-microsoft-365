import {
  createIntegrationEntity,
  createMappedRelationship,
  Entity,
  IntegrationError,
  Relationship,
  RelationshipDirection,
} from '@jupiterone/integration-sdk-core';
import {
  ComplianceState,
  DeviceType,
  ManagedDevice,
} from '@microsoft/microsoft-graph-types-beta';
import { entities as activeDirectoryEntities } from '../../../active-directory';
import { entities, INTUNE_HOST_AGENT_KEY_PREFIX } from '../../constants';
import { ManagedDeviceType, relationships } from '../../constants';

// https://docs.microsoft.com/en-us/graph/api/resources/intune-devices-manageddevice?view=graph-rest-1.0&viewFallbackFrom=graph-rest-beta
export function createManagedDeviceEntity(
  managedDevice: ManagedDevice,
): Entity {
  const isPhysicalDevice = isPhysical(managedDevice);
  const _class = ['Host'];
  if (isPhysicalDevice) {
    _class.push('Device');
  }
  return createIntegrationEntity({
    entityData: {
      source: {}, // removed due to size
      assign: {
        _class,
        _type: selectDeviceType(managedDevice.deviceType, isPhysicalDevice),
        _key: managedDevice.id!,
        category: 'endpoint',
        id: managedDevice.id,
        name: managedDevice.deviceName,
        deviceName: managedDevice.deviceName,
        displayName: managedDevice.deviceName as string,
        deviceType: managedDevice.deviceType,
        model: managedDevice.model,
        make: managedDevice.manufacturer,
        version: managedDevice.model,
        serial: managedDevice.serialNumber,
        serialNumber: managedDevice.serialNumber,
        hardwareVendor:
          managedDevice.hardwareInformation?.manufacturer ??
          managedDevice.manufacturer,
        hardwareManufacturer:
          managedDevice.hardwareInformation?.manufacturer ??
          managedDevice.manufacturer,
        hardwareModel:
          managedDevice.hardwareInformation?.model ?? managedDevice.model,
        hardwareSerial:
          managedDevice.hardwareInformation?.serialNumber ??
          managedDevice.serialNumber,
        hardwareVersion:
          managedDevice.hardwareInformation?.model ?? managedDevice.model,
        meid: managedDevice.meid, // A mobile equipment identifier (MEID) is a globally unique number identifying a physical piece of CDMA2000 mobile station equipment
        imei: managedDevice.imei, // The International Mobile Equipment Identity (IMEI) is a number, usually unique, to identify 3GPP and iDEN mobile phones, as well as some satellite phones.
        iccid: managedDevice.iccid, // Every SIM card has a ICCID number, which stands for Integrated Circuit Card Identifier
        udid: managedDevice.udid, // UDID is an acronym for Unique Device Identifier.
        wifiMacAddress: managedDevice.wiFiMacAddress, // To communicate with a Wi-Fi network, a device must identify itself to the network using a unique network address called a Media Access Control (MAC) address
        easDeviceId: managedDevice.easActivated && managedDevice.easDeviceId, // Microsoft Exchange ActiveSync device identifier
        assetTag:
          managedDevice.azureActiveDirectoryDeviceId ??
          managedDevice.azureADDeviceId, // I believe these are legacy values now
        osDetails: `${managedDevice.operatingSystem} version ${managedDevice.osVersion}`,
        osName: managedDevice.operatingSystem,
        osVersion: managedDevice.osVersion,
        userEmails: managedDevice.emailAddress
          ? [managedDevice.emailAddress]
          : undefined,
        BYOD: managedDevice.managedDeviceOwnerType === 'personal',
        ownerType: managedDevice.managedDeviceOwnerType, // 'personal', 'company' or 'unknown'
        encrypted: managedDevice.isEncrypted,
        userId: managedDevice.userId,
        userDisplayName: managedDevice.userDisplayName,
        phoneNumber: managedDevice.phoneNumber,
        managed:
          managedDevice.managementState &&
          managedDevice.managementState !== 'discovered',
        supervised: managedDevice.isSupervised,
        jailBroken: managedDevice.jailBroken !== 'False',
        username: managedDevice.userPrincipalName,
        physical: isPhysicalDevice,
        // Used to map HOSTAGENT to user_endpoint via user_endpoint's udid
        deviceId: null,
        // POTENTIAL: managedDevice.usersLoggedOn - link out to other users perhaps?
      },
    },
  });
}

export function createIntuneHostAgentEntity(
  managedDevice: ManagedDevice,
): Entity {
  return createIntegrationEntity({
    entityData: {
      source: {}, // removed due to size
      assign: {
        _class: entities.HOST_AGENT._class,
        function: ['endpoint-compliance', 'endpoint-protection'], // https://github.com/JupiterOne/data-model/blob/main/src/schemas/HostAgent.json
        _type: entities.HOST_AGENT._type,
        _key: INTUNE_HOST_AGENT_KEY_PREFIX + managedDevice.id,
        name: 'intune-host-agent',
        displayName: 'Intune Host Agent',
        managementAgent: managedDevice.managementAgent, // Management channel of the device. Possible values include: eas, mdm, easMdm, intuneClient, easIntuneClient, jamf, googleCloudDevicePolicyController, ...
        state: managedDevice.managementState,
        registrationState: managedDevice.deviceRegistrationState,
        complianceState: managedDevice.complianceState,
        compliant: isCompliant(managedDevice.complianceState),
      },
    },
  });
}

/**
 * Converts Microsoft's compliance state to JupiterOne's `compliant` boolean.
 * There are some complianceStates where we can not determine if the device is compliant or not.
 * In those cases this key should remain `undefined`.
 */
function isCompliant(complianceState?: ComplianceState) {
  return ['unknown', 'configManager', undefined].includes(complianceState)
    ? undefined
    : complianceState === 'compliant';
}

/**
 * Is the device a physical device or a virtual server
 */
function isPhysical(managedDevice: ManagedDevice) {
  return managedDevice.model
    ? managedDevice.model !== 'Virtual Machine'
    : undefined; // https://docs.microsoft.com/en-us/mem/intune/fundamentals/windows-10-virtual-machines#reporting
}

/**
 * Select the correct device _type based on the Microsoft DeviceType
 * types determined from managed-questions-endpoint.yaml
 */
export function selectDeviceType(
  deviceType?: DeviceType,
  isPhysical?: Boolean,
): ManagedDeviceType {
  if (!isPhysical) {
    return 'server';
  }
  switch (deviceType) {
    case 'desktop':
    case 'mac':
    case 'unix':
    case 'linux':
      return 'desktop';
    case 'windowsRT': // retired mobile OS
      return 'user_endpoint';
    case 'winMO6': // retired mobile OS
    case 'nokia':
    case 'iPhone':
    case 'iPod':
    case 'android':
    case 'androidForWork': // same OS as android, idk why it is differentiated here
    case 'androidEnterprise': // same OS as android, idk why it is differentiated here
    case 'androidnGMS': // same OS as android, idk why it is differentiated here
    case 'blackberry':
    case 'palm':
      return 'smartphone';
    case 'winCE':
    case 'winEmbedded':
      return 'workstation';
    case 'macMDM':
    case 'windows10x':
      return 'laptop';
    case 'cloudPC':
      return 'server';
    case 'iSocConsumer': // some open source thing
    case 'holoLens': // augmented reality tool
    case 'surfaceHub': // smart whiteboard
    case 'unknown':
      return 'user_endpoint';
    default:
      return 'user_endpoint';
  }
}

/**
 * Creates a mapped relationship between a User and a Device if userId or email is provided.
 * Should be used when the active directory is not being ingested in this integration instance.
 */
export function createUserDeviceMappedRelationship(
  managedDeviceEntity: Entity,
  userId?: string,
  email?: string,
): Relationship | undefined {
  const relationship = relationships.MULTI_USER_HAS_DEVICE.find(
    (relationship) =>
      [relationship.sourceType, relationship.targetType].includes(
        managedDeviceEntity._type,
      ),
  );
  if (!relationship) {
    throw new IntegrationError({
      message: `Could not find relationship for deviceType ${managedDeviceEntity._type}`,
      code: 'RELATIONSHIP_IMPLEMENTATION_ERROR',
    });
  }
  return userId || email
    ? createMappedRelationship({
        _class: relationship._class,
        _type: relationship._type,
        _mapping: {
          sourceEntityKey: managedDeviceEntity._key,
          relationshipDirection: RelationshipDirection.REVERSE,
          targetFilterKeys: [
            ['_class', 'id'],
            ['_class', 'email'],
          ],
          targetEntity: {
            _class: activeDirectoryEntities.USER._class,
            _type: activeDirectoryEntities.USER._type,
            _key: userId,
            id: userId,
            email: email,
          },
        },
      })
    : undefined;
}
