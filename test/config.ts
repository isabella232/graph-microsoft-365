import { IntegrationConfig } from '../src/types';

const config: IntegrationConfig = {
  clientId: 'clientId',
  clientSecret: 'clientSecret',
  tenant: 'a76fc728-0cba-45f0-a9eb-d45207e14513',
};

if (process.env.LOAD_CONFIG) {
  config.clientId = process.env.CLIENT_ID || config.clientId;
  config.clientSecret = process.env.CLIENT_SECRET || config.clientSecret;
  config.tenant = process.env.TENANT || config.tenant;
}

export { config };

/**
 * An integration config pointing at a directory that does not authorize the
 * multi-tenant app in any way.
 */
export const inaccessibleDirectoryConfig: IntegrationConfig = {
  ...config,

  /**
   * The "J1 Inaccessible" directory/tenant of adamjupiteronehotmailcom Azure
   * account.
   */
  tenant: 'd68d7cbe-a848-4b5a-98d6-d7b3d6f3dfc0',
};

/**
 * An integration config pointing at a directory that does not authorize the
 * multi-tenant app in any way.
 */
export const insufficientPermissionsDirectoryConfig: IntegrationConfig = {
  ...config,

  /**
   * The "J1 Insufficient Permissions" directory/tenant of
   * adamjupiteronehotmailcom Azure account.
   */
  tenant: '6fec25dd-44d2-4f61-a797-603edc73fb50',
};

/**
 * An integration config pointing at a directory that does not have Moblie
 * Device Management set up in any way.
 */
export const noMdmConfig: IntegrationConfig = {
  ...config,

  /**
   * The "Org Outside J1" directory/tenant of
   * adamjupiteronehotmailcom Azure account.
   */
  tenant: '75f092de-c730-4a62-a1dd-4324cb0b83af',
};
