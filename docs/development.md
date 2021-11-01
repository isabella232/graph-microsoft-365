# Development

The [Microsoft Graph API][msgraph-api] provides access to resources in Microsoft
365 services. This project uses a number of JavaScript libraries provided by
Microsoft. Please review the source code for details. None of them are relevant
for getting started. Interactive documentation is available in the [Microsoft
Graph Explorer][msgraph-explorer]

## Prerequisites

- An Azure account with an App Registration that will provide credentials for
  the integration to authenticate with Microsoft Graph APIs. The App
  Registration also defines the permissions the integration requires and which
  the target tenant must authorize.
- An Active Directory tenant to target for ingestion. It is possible to target
  the Active Directory tenants defined in the Azure account holding the App
  Registration. Multi-tenant App Registrations that have not undergone
  [Publisher Verification][publisher-verification] cannot access other tenants.

A JupiterOne staff developer can provide credentials for an existing development
Azure account with an App Registration and tenants that tests are written
against. This is the easiest way to begin making changes to the integration.

Alternatively, you may establish a new Azure account, though tests will likely
need to be improved to avoid specific account information.

A [free trail of Intune][get-intune-trial] is required when working on that part
of the integration. Learn more about [activating devices][device-enrollment].

## App Registration

In the Azure portal:

1. Create a mulit-tenant App Registration
2. Configure the required [API permissions](#api-permissions)
3. Add a 2-year secret
4. Add a Redirect URIs for local development:
   `https://localhost/microsoft-365/oauth-microsoft-365/v1/authorize`

### API Permissions

1. `DeviceManagementApps.Read.All`
   1. Read Microsoft Intune apps
   1. Needed for creating `Application` entities
2. `DeviceManagementConfiguration.Read.All`
   1. Read Microsoft Intune device configuration and policies
   2. Needed for creating `Configuration` and `ControlPolicy` entities
3. `DeviceManagementManagedDevices.Read.All`
   1. Read Microsoft Intune devices
   2. Needed for creating `Device` and `HostAgent` entities
4. `Organization.Read.All`
   1. Read organization information
   2. Needed for creating the `Account` entity
5. `APIConnectors.Read.All`
   1. Read API connectors for authentication flows
   2. Needed for enriching the `Account` entity with Intune subscription
      infomation
6. `DeviceManagementServiceConfig.Read.All`
   1. Read Microsoft Intune configuration
   2. Also needed for enriching the `Account` entity with Intune subscription
      infomation
7. `Directory.Read.All`
   1. Read directory data
   2. Needed for creating `User`, `Group`, and `GroupUser` entities

## Target Tenants

The integration is tested against three Active Directory tenants:

1. The app is installed, all permissions are granted
1. The app is installed, most permissions are insufficient
1. The app is not installed

This allows for ensuring the Microsoft Graph API code handles some common target
configuration scenarios.

You'll need a user account with global administrator access in each tenant.
[Grant admin consent](#authentication) to the multi-tenant application as
follows:

1. Default tenant: grant permission now and always grant new permissions as
   development of converters advances
2. "J1 Insufficient Permissions" tenant: grant permissions now
   (`Directory.Read.All` is all at this point in setup), but never grant any
   additional permisssions, to allow for testing cases where the app cannot
   fetch resources
3. "J1 Inaccessible" tenant: do not install the app at all here, to allow for
   testing cases where we have not been installed in a valid directory

Update `test/config.ts` with directory IDs as appropriate.

## Authentication

JupiterOne is configured in Azure App Registrations as a [multi-tenant
daemon/server application][daemon-app]. The [OAuth 2 client credentials grant
flow][oauth2-client-cred-flow] is executed to obtain consent from an
organizational tenant account having global administrator access. The flow will
provide the tenant ID where consent has been granted, which is stored for use in
Microsoft Graph API calls.

Admin consent is granted to JupiterOne by:

1. Log in to JupiterOne as a user with permission to set up an integration
2. Add a Microsoft 365 integration instance
3. You will be directed to Microsoft's identity platform, where you must login
   in as a global administrator of the Active Directory tenant you intend to
   target/ingest
4. Review the requested permissions and grant consent

To exercise the grant flow:

1. Log in as a global administrator to the Active Directory Tenant you intend to
   target/ingest
1. Follow the url returned from the J1
   `/integration-microsoft-365/v1/generate-auth-url` endpoint.
1. After being redirected to something like
   `https://localhost/microsoft-365/oauth-microsoft-365/v1/authorize?admin_consent=True&tenant=tenant-id&state=12345`,
   capture the `tenant` query param.
   1. You may need to check your network history for this query param as you
      will likelybe redirected back to your instance configuration page faster
      than you can pull the the tenant param.
   1. This will be the same tenant id that you are logged into when you granted
      concent.

Use this `tenant` ID and information from the App Registration to create an
`.env` file for local execution of the daemon/server application (this
repository):

```
CLIENT_ID='885121e7-c3c6-4378-8f6b-e315cc5994ce'
CLIENT_SECRET='<top secret passphrase>'
TENANT='<tenant / directory id>'
```

This will be used to auto-populate the
[integration instance configuration](../src/instanceConfigFields.json).

## References

Sample Client Credentials Flow Project

- https://github.com/AzureAD/azure-activedirectory-library-for-nodejs/blob/master/sample/client-credentials-sample.js

SDK Links

- https://docs.microsoft.com/en-us/azure/developer/javascript/azure-sdk-library-package-index
- https://docs.microsoft.com/en-us/javascript/api/overview/azure/activedirectory?view=azure-node-latest

Client Credentials oAuth flow Overview

- https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow#application-permissions

How to set up permissions in the Azure console

- https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-configure-app-expose-web-apis
- https://docs.microsoft.com/en-us/azure/active-directory/develop/scenario-daemon-overview

How to add a client secret in the Azure console

- https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app#add-a-client-secret

[msgraph-api]: https://docs.microsoft.com/en-us/graph/overview
[msgraph-explorer]: https://developer.microsoft.com/en-us/graph/graph-explorer
[daemon-app]:
  https://docs.microsoft.com/en-us/azure/active-directory/develop/scenario-daemon-overview
[oauth2-client-cred-flow]:
  https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow#protocol-diagram
[admin-consent-j1dev]:
  https://login.microsoftonline.com/common/adminconsent?client_id=885121e7-c3c6-4378-8f6b-e315cc5994ce&state=12345&redirect_uri=https://localhost/microsoft-365/install
[get-intune-trial]:
  https://www.microsoft.com/en-us/microsoft-365/microsoft-endpoint-manager
[device-enrollment]:
  https://docs.microsoft.com/en-us/mem/intune/enrollment/device-enrollment
[publisher-verification]:
  https://docs.microsoft.com/en-us/azure/active-directory/develop/publisher-verification-overview
