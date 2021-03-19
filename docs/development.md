# Development

The [Microsoft Graph API][msgraph-api] provides access to resources in Microsoft
365 services. This project uses a number of JavaScript libraries provided by
Microsoft. Please review the source code for details. None of them are relevant
for getting started. Interactive documentation is available in the [Microsoft
Graph Explorer][msgraph-explorer]

## Prerequisites

- An Azure account with a registered app that will provide credentials for the
  program to connect to Microsoft Graph APIs (steps to configure below).
- A Microsoft 365 account to target for ingestion.

## Azure provider account setup

The Microsoft Graph API code is tested against three Active Directories:

1. The multi-tenant app is installed, all permissions are granted
1. The multi-tenant app is installed, most permissions are insufficient
1. The multi-tenant app is not installed

This allows for ensuring the API code handles some common target configuration
scenarios.

A JupiterOne staff developer can provide credentials for an existing development
Azure account that tests are written against. This is the easiest way to begin
making changes to the integration. Otherwise, you would need your own
development Azure account, and the tests will likely need to be improved to
avoid specific account information.

You may obtain a free Azure account with a hotmail.com email address (one will
be assigned to you when you create the Azure account, which provisions an Azure
AD directory), to avoid any confusion about the purpose of the account.

If you would like to ingest Microsoft Intune data, you will also need to
activate a free trial for Intune on your new Azure account which may be done at
[this link][get-intune-trial]. Activating devices for management in Intune
varies depending on the device [This documentation][device-enrollment] should
guide you through it.

In the Azure portal:

1. Create an App Registration, multi-tenant, with the following API Permissions
   configured:
   1. `DeviceManagementApps.Read.All`
      1. Read Microsoft Intune apps
      1. Needed for creating `Application` entities
   1. `DeviceManagementConfiguration.Read.All`
      1. Read Microsoft Intune device configuration and policies
      1. Needed for creating `Configuration` and `ControlPolicy` entities
   1. `DeviceManagementManagedDevices.Read.All`
      1. Read Microsoft Intune devices
      1. Needed for creating `Device` and `HostAgent` entities
   1. `Organization.Read.All`
      1. Read organization information
      1. Needed for creating the `Account` entity
   1. `APIConnectors.Read.All`
      1. Read API connectors for authentication flows
      1. Needed for enriching the `Account` entity with Intune subscription
         infomation
   1. `DeviceManagementServiceConfig.Read.All`
      1. Read Microsoft Intune configuration
      1. Also needed for enriching the `Account` entity with Intune subscription
         infomation
   1. `Directory.Read.All`
      1. Read directory data
      1. Needed for creating `User`, `Group`, and `GroupUser` entities
1. Add a 1-year secret (store securely in LastPass)
1. Add a couple of optional Redirect URIs:
   1. https://apps.dev.jupiterone.io/oauth-microsoft-365/v1/authorize
   1. https://localhost/microsoft-365/oauth-microsoft-365/v1/authorize

Then, create two additional Active Directory Tenants (you'll have a Default
Directory already), a user account with Global Administrator Role assignment in
each one for yourself, and then [grant Admin Consent](#authentication) to the
multi-tenant Enterprise Application as follows:

1. Default directory, grant permission now and always grant new permissions as
   development of converters advances
1. "J1 Insufficient Permissions" directory, grant permissions now
   (`Directory.Read.All` is all at this point in setup), but never grant any
   additional permisssions, to allow for testing cases where the app cannot
   fetch resources
1. "J1 Inaccessible" directory, do not install the app at all here, to allow for
   testing cases where we have not be installed in a valid directory

Update `test/config.ts` with directory IDs as appropriate.

## Authentication

JupiterOne is configured in Azure App Registrations as a [multi-tenant
daemon/server application][daemon-app]. The [OAuth 2 client credentials grant
flow][oauth2-client-cred-flow] is executed to obtain consent from an
organization administrator, producing a Service Principal in a tenant that
grants consent to the app. The flow will provide the tenant ID where consent has
been granted, which is stored for use in Microsoft Graph API calls.

Admin consent is granted to JupiterOne by:

1. Log in to JupiterOne as a user with permission to set up an integration
1. Add a Microsoft 365 integration instance
1. You will be directed to Microsoft's identity platform, where you must login
   in as a Global Administrator of the Active Directory Tenant you intend to
   target/ingest
1. Review requested permissions and grant consent

To exercise the grant flow:

1. Log in as a Global Administrator to the Active Directory Tenant you intend to
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
[authentication configuration](../src/instanceConfigFields.json).

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
