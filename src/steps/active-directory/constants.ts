import { RelationshipClass } from '@jupiterone/integration-sdk-core';

export const steps: Record<string, string> = {
  FETCH_ACCOUNT: 'account',
  FETCH_GROUPS: 'groups',
  FETCH_GROUP_MEMBERS: 'group-members',
  FETCH_USERS: 'users',
};

export const entities = {
  ACCOUNT: {
    resourceName: '[AD] Account',
    _type: 'microsoft_365_account',
    _class: ['Account'],
  },
  GROUP: {
    resourceName: '[AD] Group',
    _type: 'azure_user_group',
    _class: ['UserGroup'],
  },
  USER: {
    resourceName: '[AD] User',
    _type: 'azure_user',
    _class: ['User'],
  },
  ORGANIZATION: {
    resourceName: '[AD] Organization',
    _type: 'azure_organization',
    _class: ['Organization'],
  },
  /**
   * The entity used for members of groups which are not one of the ingested
   * directory objects.
   */
  GROUP_MEMEBER: {
    resourceName: '[AD] Group Member',
    _type: 'azure_group_member',
    _class: 'User',
  },
};

export const relationships = {
  ACCOUNT_HAS_USER: {
    _type: 'microsoft_365_account_has_azure_user',
    sourceType: entities.ACCOUNT._type,
    _class: RelationshipClass.HAS,
    targetType: entities.USER._type,
  },
  ACCOUNT_HAS_GROUP: {
    _type: 'microsoft_365_account_has_azure_group',
    sourceType: entities.ACCOUNT._type,
    _class: RelationshipClass.HAS,
    targetType: entities.GROUP._type,
  },
  GROUP_HAS_MEMBER: {
    _type: 'azure_group_has_member',
    sourceType: entities.GROUP._type,
    _class: RelationshipClass.HAS,
    targetType: entities.GROUP_MEMEBER._type,
  },
  GROUP_HAS_USER: {
    _type: 'azure_group_has_user',
    sourceType: entities.GROUP._type,
    _class: RelationshipClass.HAS,
    targetType: entities.USER._type,
  },
  GROUP_HAS_GROUP: {
    _type: 'azure_group_has_group',
    sourceType: entities.GROUP._type,
    _class: RelationshipClass.HAS,
    targetType: entities.GROUP._type,
  },
};

export const DATA_ACCOUNT_ENTITY = entities.ACCOUNT._type;
