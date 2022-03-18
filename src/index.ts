import { IntegrationInvocationConfig } from '@jupiterone/integration-sdk-core';

import instanceConfigFields from './instanceConfigFields';
import { activeDirectorySteps } from './steps/active-directory';
import { intuneSteps } from './steps/intune';
import { IntegrationConfig } from './types';
import { getStepStartStates } from './utils/getStepStartStates';
import { validateInvocation } from './validateInvocation';

export const integrationSteps = [...activeDirectorySteps, ...intuneSteps];

export const invocationConfig: IntegrationInvocationConfig<IntegrationConfig> =
  {
    instanceConfigFields,
    validateInvocation,
    getStepStartStates,
    integrationSteps,
  };
