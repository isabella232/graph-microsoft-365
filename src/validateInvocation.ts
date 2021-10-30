import {
  IntegrationExecutionContext,
  IntegrationValidationError,
} from '@jupiterone/integration-sdk-core';

import { GraphClient } from './ms-graph/client';
import { IntegrationConfig } from './types';

export function validateExecutionConfig(
  executionContext: IntegrationExecutionContext<IntegrationConfig>,
): void {
  const { clientId, clientSecret, tenant } = executionContext.instance.config;

  executionContext.logger.info(
    {
      clientId,
      tenantId: tenant,
    },
    'Configured to make Microsoft Graph API calls to tenantId acting as clientId',
  );

  if (!clientId || !clientSecret || !tenant) {
    throw new IntegrationValidationError(
      'Config requires all of {clientId, clientSecret, tenant}',
    );
  }
}

export async function validateInvocation(
  context: IntegrationExecutionContext<IntegrationConfig>,
) {
  validateExecutionConfig(context);
  const apiClient = new GraphClient(context.logger, context.instance.config);
  await apiClient.verifyAuthentication();
}
