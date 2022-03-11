import {
  createIntegrationEntity,
  Entity,
  parseTimePropertyValue,
} from '@jupiterone/integration-sdk-core';
import {
  AndroidManagedStoreApp,
  ManagedApp,
  WebApp,
  IosLobApp,
  AndroidLobApp,
  WindowsPhoneXAP,
  MobileLobApp,
  DetectedApp,
} from '@microsoft/microsoft-graph-types-beta';
import { entities } from '../../constants';

export const DETECTED_APP_KEY_PREFIX = 'IntuneDetected:';
export const UNVERSIONED = 'unversioned';

/**
 * Creates an application entity that represents an application that is being managed by Intune.
 * This should not contain information unique to specific device installations.
 * Intune uses this to apply policies and configurations to applications either off the shelf or uploaded to Intune.
 * https://docs.microsoft.com/en-us/graph/api/resources/intune-apps-managedapp?view=graph-rest-beta
 */
export function createManagedApplicationEntity(
  managedApp: ManagedApp & { '@odata.type': string },
): Entity {
  return createIntegrationEntity({
    entityData: {
      source: managedApp,
      assign: {
        _class: entities.MANAGED_APPLICATION._class,
        _type: entities.MANAGED_APPLICATION._type,
        _key: managedApp.id,
        id: managedApp.id,
        name: managedApp.displayName?.toLowerCase(),
        displayName: managedApp.displayName as string,
        description: managedApp.description,
        notes: managedApp.notes ? [managedApp.notes] : [],
        COTS: !isLineOfBusiness(managedApp['@odata.type']),
        external: !isLineOfBusiness(managedApp['@odata.type']),
        mobile: isMobile(managedApp['@odata.type']),
        productionURL:
          (managedApp as WebApp).appUrl ??
          (managedApp as AndroidManagedStoreApp).appStoreUrl,
        publisher: managedApp.publisher,
        isPublished: managedApp.publishingState === 'published', // Essentially if it is available for download
        createdOn: parseTimePropertyValue(managedApp.createdDateTime),
        lastUpdatedOn: parseTimePropertyValue(managedApp.lastModifiedDateTime),
        featured: managedApp.isFeatured, // Indicates that they are featuring this app on their Company Portal
        privacyInformationURL: managedApp.privacyInformationUrl,
        informationURL: managedApp.informationUrl,
        owner: managedApp.owner || undefined, // Ex: Microsoft, Google, Facebook...
        developer: managedApp.developer, // Almost always the same as the owner

        // Line of Business Apps
        version: findNewestVersion(managedApp),
        committedContentVersion: (managedApp as MobileLobApp)
          .committedContentVersion,
        packageId: (managedApp as AndroidLobApp).packageId,
      },
    },
  });
}

/**
 * Creates an application entity that represents a global application.
 * This entity could be linked to applications in other integrations and therefore should not contain Intune-specific information.
 * https://docs.microsoft.com/en-us/graph/api/resources/intune-devices-detectedapp?view=graph-rest-beta
 */
export function createDetectedApplicationEntity(
  detectedApp: DetectedApp,
): Entity {
  return createIntegrationEntity({
    entityData: {
      source: {},
      assign: {
        _class: entities.DETECTED_APPLICATION._class,
        _type: entities.DETECTED_APPLICATION._type,
        // The key needs to be the name of the application so multiple relationships can be made to the same detected application entity.
        // The id is unique per detection so using it as the key would make jobstate.findEntitiy not work.
        // The prefix is necessary to ensure key is at least 10 characters
        _key:
          DETECTED_APP_KEY_PREFIX + detectedApp.displayName?.toLowerCase() ??
          detectedApp.id, // Fallback to id if there is no name for the app
        name: detectedApp.displayName?.toLowerCase(),
        displayName: detectedApp.displayName as string,
      },
    },
  });
}

/**
 * Line of business apps need to be manually uploaded to Azure ensuring that they are custom.
 * All other managed apps go throuhg an app store or a website (webApp).
 *
 * @param dataModel Microsoft datatype for the api response.
 * Examples: "#microsoft.graph.webApp", "#microsoft.graph.managedIOSStoreApp", "#microsoft.graph.androidLobApp"
 */
function isLineOfBusiness(dataModel: string) {
  return dataModel.toLowerCase().includes('lob');
}

/**
 *
 * @param dataModel Microsoft datatype for the api response.
 * Examples: "#microsoft.graph.androidStoreApp", "#microsoft.graph.managedIOSStoreApp", "#microsoft.graph.windowsMobileMSI", "#microsoft.graph.officeSuiteApp"
 */
function isMobile(dataModel: string) {
  return [
    'ios', // matches iPhone managed app types
    'android', // matches Android managed app types
    'mobile', // matches Windows phone app types
    'webApp', // webApps are availble for both mobile and desktop
  ].some((el) => dataModel.toLowerCase().indexOf(el) > -1);
}

export function findNewestVersion(
  managedApp: ManagedApp & WindowsPhoneXAP & AndroidLobApp & IosLobApp,
) {
  return (
    managedApp.versionName ?? // Version name is the most preferable version information as it is in the format X.X.X
    managedApp.versionCode ??
    managedApp.versionNumber ??
    managedApp.identityVersion ??
    managedApp.version ??
    UNVERSIONED
  );
}
