import {
  IntegrationInstanceConfig,
  IntegrationStepExecutionContext,
} from '@jupiterone/integration-sdk-core';

/**
 * Properties provided by the `IntegrationInstance.config`. This reflects the
 * same properties defined by `instanceConfigFields`.
 */
export interface IntegrationConfig extends IntegrationInstanceConfig {
  /**
   * The Azure application client ID used to identify the program as the
   * registered app. This will be the same for all tenants since this is a
   * multi-tenant application.
   */
  clientId: string;

  /**
   * The Azuser application client secret used to authenticate requests.
   */
  clientSecret: string;

  /**
   * The target directory/tenant ID, identified during the admin consent OAuth
   * flow.
   */
  tenant: string;
}

/**
 * An `IntegrationStepExecutionContext` typed for this integration's
 * `IntegrationInstanceConfig`.
 */
export type IntegrationStepContext =
  IntegrationStepExecutionContext<IntegrationConfig>;
