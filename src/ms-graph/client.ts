import { AccessToken, ClientSecretCredential } from '@azure/identity';
import {
  IntegrationLogger,
  IntegrationProviderAPIError,
  IntegrationProviderAuthenticationError,
  IntegrationProviderAuthorizationError,
} from '@jupiterone/integration-sdk-core';
import {
  AuthenticationProvider,
  AuthenticationProviderOptions,
  Client,
} from '@microsoft/microsoft-graph-client';
import {
  DeviceManagement,
  Organization,
} from '@microsoft/microsoft-graph-types';
import { DeviceManagementSubscriptionState } from '@microsoft/microsoft-graph-types-beta';
import 'isomorphic-unfetch';
import { toArray } from '../utils/toArray';

import { ClientConfig } from './types';

export type QueryParams = string | { [key: string]: string | number };

interface GraphClientResponse<T> {
  value: T[];
  '@odata.nextLink'?: string;
}

/**
 * Pagination: https://docs.microsoft.com/en-us/graph/paging
 * Throttling with retry after: https://docs.microsoft.com/en-us/graph/throttling
 * Batching requests: https://docs.microsoft.com/en-us/graph/json-batching
 */
export class GraphClient {
  protected client: Client;

  constructor(
    readonly logger: IntegrationLogger,
    readonly config: ClientConfig,
  ) {
    this.client = Client.initWithMiddleware({
      authProvider: new GraphAuthenticationProvider(config),
    });
  }

  public async verifyAuthentication(): Promise<void> {
    try {
      await this.client.api('/organization').get();
    } catch (err) {
      throw new IntegrationProviderAuthenticationError({
        cause: err,
        endpoint: '/organization',
        status: err.statusCode,
        statusText: err.code,
      });
    }
  }

  public async fetchMetadata(): Promise<object> {
    return this.client.api('/').get();
  }

  /**
   * Fetch organization details. Throws an error when this cannot be
   * accomplished.
   */
  public async fetchOrganization(): Promise<Organization> {
    const url = '/organization';
    try {
      const response = await this.client.api(url).get();
      return response.value[0];
    } catch (err) {
      this.handleApiError(err, url);
      const errorOptions = {
        cause: err,
        endpoint: url,
        status: err.statusCode,
        statusText: err.code,
      };
      if (err.statusCode === 401) {
        throw new IntegrationProviderAuthorizationError(errorOptions);
      } else {
        throw new IntegrationProviderAPIError(errorOptions);
      }
    }
  }

  // https://docs.microsoft.com/en-us/graph/api/resources/intune-shared-devicemanagement?view=graph-rest-1.0
  // https://docs.microsoft.com/en-us/graph/api/intune-shared-devicemanagement-get?view=graph-rest-1.0
  public async getIntuneAccountId(): Promise<
    Pick<DeviceManagement, 'intuneAccountId'> | undefined
  > {
    const url = '/deviceManagement';
    try {
      return await this.client.api(url).select('intuneAccountId').get();
    } catch (error) {
      this.handleApiError(error, url);
    }
  }

  /**
   * Fetches the Intune subscriptions state for this account. Will error if Intune is not set up.
   * Need to access the subscriptionState via this endpoint due to the subscriptionState property on
   * deviceManagement being incorrect on Microsoft's end. This endpoint is how Intune's UI determines
   * this value so it is also we are going to access it. This endpoint is not documented.
   */
  public async getIntuneSubscriptionState(): Promise<
    { value: DeviceManagementSubscriptionState } | undefined
  > {
    const url =
      'https://graph.microsoft.com/beta/deviceManagement/subscriptionState';
    try {
      return await this.client.api(url).get();
    } catch (error) {
      this.handleApiError(error, url);
    }
  }

  /**
   * Fetches the authority that is controlling the mobile device management for this account.
   * This can be gotten in the initial organization call, but because the mdmAuthority is not
   * a default api value, it is simpler to grab it on its own.
   */
  // https://docs.microsoft.com/en-us/graph/api/resources/intune-onboarding-organization?view=graph-rest-beta
  public async getMobileDeviceManagementAuthority(
    organizationId: string,
  ): Promise<
    Pick<Organization, 'mobileDeviceManagementAuthority'> | undefined
  > {
    const url = `/organization/${organizationId}`;
    try {
      return await this.client
        .api(url)
        .select('mobileDeviceManagementAuthority')
        .get();
    } catch (error) {
      this.handleApiError(error, url);
    }
  }

  // Not using PageIterator because it doesn't allow async callback
  /**
   * Iterate resources. 401 Unauthorized, 403 Forbidden, and 404 Not Found
   * responses are considered empty collections. Other API errors will be
   * thrown.
   */
  protected async iterateResources<T>({
    resourceUrl,
    query,
    callback,
  }: {
    resourceUrl: string;
    query?: QueryParams;
    callback: (item: T) => void | Promise<void>;
  }): Promise<void> {
    let nextLink: string | undefined = resourceUrl;
    let retries = 0;
    let response: GraphClientResponse<T> | undefined;
    do {
      try {
        response = await this.callApi<T>({
          link: nextLink,
          query,
        });
      } catch (err) {
        if (
          err.message ===
            'CompactToken parsing failed with error code: 80049217' &&
          nextLink &&
          retries < 5
        ) {
          // Retry a few times to handle sporatic timing issue with this sdk - https://github.com/OneDrive/onedrive-api-docs/issues/785
          retries++;
          continue;
        } else {
          nextLink = undefined;
          this.handleApiError(err, resourceUrl);
        }
      }
      if (response) {
        for (const value of response.value) {
          await callback(value);
        }
        nextLink = response['@odata.nextLink'];
      } else {
        nextLink = undefined;
      }
    } while (nextLink);
  }

  protected async callApi<T>({
    link,
    query,
  }: {
    link: string;
    query?: QueryParams;
  }): Promise<GraphClientResponse<T> | undefined> {
    let api = this.client.api(link);
    if (query) {
      api = api.query(query);
    }

    const response = await api.get();
    if (response) {
      response.value = toArray(response.value ?? response);
      return response;
    }
  }

  private handleApiError(err: any, resourceUrl: string) {
    const errorOptions = {
      cause: err,
      endpoint: resourceUrl,
      status: err.statusCode,
      statusText: err.statusText || err.code || err.message,
    };
    // Skip errors caused by the account not being configured for the content being ingested
    if (err.message.startsWith('Request not applicable to target tenant')) {
      this.logger.info(err);
    } else if (err.statusCode === 401) {
      this.logger.info({ resourceUrl }, 'Unauthorized');
    } else if (err.statusCode === 403) {
      this.logger.info({ resourceUrl }, 'Forbidden');
    } else if (err.statusCode !== 404) {
      throw new IntegrationProviderAPIError(errorOptions);
    }
  }
}

class GraphAuthenticationProvider implements AuthenticationProvider {
  private accessToken: AccessToken | null;

  constructor(readonly config: ClientConfig) {}

  /**
   * Obtains an accessToken (in case of success) or rejects with error (in case
   * of failure). Refreshes token when it is approaching expiration.
   */
  public async getAccessToken(
    options?: AuthenticationProviderOptions,
  ): Promise<string> {
    if (
      !this.accessToken ||
      this.accessToken.expiresOnTimestamp - Date.now() < 1000 * 60
    ) {
      const credentials = new ClientSecretCredential(
        this.config.tenant,
        this.config.clientId,
        this.config.clientSecret,
      );
      const scopes = options?.scopes || 'https://graph.microsoft.com/.default';
      this.accessToken = await credentials.getToken(scopes);
    }
    if (!this.accessToken) {
      throw new Error(
        'Authentication cannot be peformed at this time, no reason provided by Microsoft identity platform.',
      );
    } else {
      return this.accessToken.token;
    }
  }
}
