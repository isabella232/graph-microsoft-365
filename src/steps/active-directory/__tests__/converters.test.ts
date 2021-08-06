import { RelationshipDirection } from '@jupiterone/integration-sdk-core';
import { entities } from '../constants';
import {
  createAccountEntityWithOrganization,
  createAccountGroupRelationship,
  createAccountUserRelationship,
  createGroupEntity,
  createGroupMemberRelationship,
  createOrganizationEntity,
  createUserEntity,
} from '../converters';
import exampleAccountEntity from './fixtures/exampleAccountEntity';
import exampleGroup from './fixtures/exampleGroup';
import exampleGroupEntity from './fixtures/exampleGroupEntity';
import exampleGroupMemberGroup from './fixtures/exampleGroupMemberGroup';
import exampleGroupMemberOther from './fixtures/exampleGroupMemberOther';
import exampleGroupMemberUser from './fixtures/exampleGroupMemberUser';
import exampleIntegrationInstance from './fixtures/exampleIntegrationInstance';
import exampleOrganization from './fixtures/exampleOrganization';

describe('createAccountEntityWithOrganization', () => {
  test('properties transferred', () => {
    const exampleIntuneConfig = {
      mobileDeviceManagementAuthority: 'mobileDeviceManagementAuthority',
      subscriptionState: 'subscriptionState',
      intuneAccountID: 'intuneAccountID',
    };
    const accountEntity = createAccountEntityWithOrganization(
      exampleIntegrationInstance,
      exampleOrganization,
      exampleIntuneConfig,
    );
    expect(accountEntity).toMatchSnapshot(
      'createAccountEntityWithOrganization',
    );
  });
});

describe('createGroupEntity', () => {
  test('properties transferred', () => {
    expect(createGroupEntity(exampleGroup)).toEqual({
      _class: ['UserGroup'],
      _key: '89fac263-2430-48fd-9278-dacfdfc89792',
      _type: 'azure_user_group',
      _rawData: [],
      classification: undefined,
      createdOn: 1556042765000,
      deletedOn: undefined,
      description: 'descr',
      name: 'test group',
      displayName: 'test group',
      id: '89fac263-2430-48fd-9278-dacfdfc89792',
      mailEnabled: false,
      mailNickname: '8bb2d1c34',
      renewedOn: 1556042765000,
      securityEnabled: true,
    });
  });
});

describe('createUserEntity', () => {
  test('properties transferred', () => {
    const rawData = {
      businessPhones: ['+1 2223334444'],
      displayName: 'Andrew Kulakov',
      givenName: 'Andrew',
      jobTitle: 'test title',
      mail: undefined,
      mobilePhone: '+1 2223334444',
      officeLocation: 'DBP',
      preferredLanguage: undefined,
      surname: 'Kulakov',
      userPrincipalName:
        'admin_test.dualboot.com#EXT#@admintestdualboot.onmicrosoft.com',
      id: 'abf00eda-02d6-4053-a077-eef036e1a4c8',
    };
    expect(createUserEntity(rawData)).toEqual({
      _class: ['User'],
      _key: 'abf00eda-02d6-4053-a077-eef036e1a4c8',
      _type: 'azure_user',
      _rawData: [],
      name: 'Andrew Kulakov',
      displayName: 'Andrew Kulakov',
      givenName: 'Andrew',
      firstName: 'Andrew',
      id: 'abf00eda-02d6-4053-a077-eef036e1a4c8',
      jobTitle: 'test title',
      mobilePhone: '+1 2223334444',
      officeLocation: 'DBP',
      preferredLanguage: undefined,
      surname: 'Kulakov',
      lastName: 'Kulakov',
      username:
        'admin_test.dualboot.com#EXT#@admintestdualboot.onmicrosoft.com',
      userPrincipalName:
        'admin_test.dualboot.com#EXT#@admintestdualboot.onmicrosoft.com',
    });
  });
});

describe('createOrganizationEntity', () => {
  test('properties transferred', () => {
    expect(createOrganizationEntity(exampleOrganization)).toEqual({
      _class: ['Organization'],
      _key: '1111111-1111-1111-1111-111111111111',
      _rawData: [
        {
          name: 'default',
          rawData: exampleOrganization,
        },
      ],
      _type: 'azure_organization',
      id: '1111111-1111-1111-1111-111111111111',
      displayName: 'Default Directory',
      website: 'verifiedDomain.onmicrosoft.com',
      emailDomain: 'verifiedDomain.onmicrosoft.com',
    });
  });
});

describe('createAccountGroupRelationship', () => {
  test('properties transferred', () => {
    expect(
      createAccountGroupRelationship(exampleAccountEntity, {
        _key: '89fac263-2430-48fd-9278-dacfdfc89792',
        _class: entities.GROUP._class,
        _type: entities.GROUP._type,
        id: '89fac263-2430-48fd-9278-dacfdfc89792',
        deletedDateTime: undefined,
        classification: undefined,
        createdDateTime: '2019-04-23T18:06:05Z',
        description: 'descr',
        displayName: 'test group',
        groupTypes: [],
        mail: undefined,
        mailEnabled: false,
        mailNickname: '8bb2d1c34',
        onPremisesLastSyncDateTime: undefined,
        onPremisesSecurityIdentifier: undefined,
        onPremisesSyncEnabled: undefined,
        proxyAddresses: [],
        renewedDateTime: '2019-04-23T18:06:05Z',
        securityEnabled: true,
        visibility: undefined,
        onPremisesProvisioningErrors: [],
      }),
    ).toEqual({
      _class: 'HAS',
      _fromEntityKey: 'microsoft_365_account_id',
      _key: 'microsoft_365_account_id|has|89fac263-2430-48fd-9278-dacfdfc89792',
      _toEntityKey: '89fac263-2430-48fd-9278-dacfdfc89792',
      _type: 'microsoft_365_account_has_azure_group',
      displayName: 'HAS',
    });
  });
});

describe('createAccountUserRelationship', () => {
  test('properties transferred', () => {
    expect(
      createAccountUserRelationship(exampleAccountEntity, {
        _key: 'abf00eda-02d6-4053-a077-eef036e1a4c8',
        _class: entities.USER._class,
        _type: entities.USER._type,
        businessPhones: ['+1 2223334444'],
        displayName: 'Andrew Kulakov',
        givenName: 'Andrew',
        jobTitle: 'test title',
        mail: undefined,
        mobilePhone: '+1 2223334444',
        officeLocation: 'DBP',
        preferredLanguage: undefined,
        surname: 'Kulakov',
        userPrincipalName:
          'admin_test.dualboot.com#EXT#@admintestdualboot.onmicrosoft.com',
        id: 'abf00eda-02d6-4053-a077-eef036e1a4c8',
      }),
    ).toEqual({
      _class: 'HAS',
      _fromEntityKey: 'microsoft_365_account_id',
      _key: 'microsoft_365_account_id|has|abf00eda-02d6-4053-a077-eef036e1a4c8',
      _toEntityKey: 'abf00eda-02d6-4053-a077-eef036e1a4c8',
      _type: 'microsoft_365_account_has_azure_user',
      displayName: 'HAS',
    });
  });
});

describe('createGroupMemberRelationship', () => {
  test('properties transferred for users', () => {
    expect(
      createGroupMemberRelationship(exampleGroupEntity, exampleGroupMemberUser),
    ).toEqual({
      _class: 'HAS',
      _key:
        '89fac263-2430-48fd-9278-dacfdfc89792|has|324e8daa-9c29-42a4-a74b-b9893e6d9750',
      _type: 'azure_group_has_member',
      _mapping: {
        relationshipDirection: RelationshipDirection.FORWARD,
        sourceEntityKey: '89fac263-2430-48fd-9278-dacfdfc89792',
        targetFilterKeys: [['_type', '_key']],
        targetEntity: {
          _key: '324e8daa-9c29-42a4-a74b-b9893e6d9750',
          _type: 'azure_user',
          _class: 'User',
          displayName: 'User Name',
          jobTitle: 'Job Title',
          email: 'user@example.com',
        },
      },
      groupId: '89fac263-2430-48fd-9278-dacfdfc89792',
      memberId: '324e8daa-9c29-42a4-a74b-b9893e6d9750',
      memberType: '#microsoft.graph.user',
      displayName: 'HAS',
    });
  });

  test('properties transferred for groups', () => {
    expect(
      createGroupMemberRelationship(
        exampleGroupEntity,
        exampleGroupMemberGroup,
      ),
    ).toEqual({
      _class: 'HAS',
      _key:
        '89fac263-2430-48fd-9278-dacfdfc89792|has|324e8daa-9c29-42a4-a74b-b9893e6d9750',
      _type: 'azure_group_has_member',
      _mapping: {
        relationshipDirection: RelationshipDirection.FORWARD,
        sourceEntityKey: '89fac263-2430-48fd-9278-dacfdfc89792',
        targetFilterKeys: [['_type', '_key']],
        targetEntity: {
          _key: '324e8daa-9c29-42a4-a74b-b9893e6d9750',
          _type: 'azure_user_group',
          _class: 'UserGroup',
          displayName: 'Managers',
          jobTitle: null,
          email: null,
        },
      },
      groupId: '89fac263-2430-48fd-9278-dacfdfc89792',
      memberId: '324e8daa-9c29-42a4-a74b-b9893e6d9750',
      memberType: '#microsoft.graph.group',
      displayName: 'HAS',
    });
  });

  test('properties transferred for other', () => {
    expect(
      createGroupMemberRelationship(
        exampleGroupEntity,
        exampleGroupMemberOther,
      ),
    ).toEqual({
      _class: 'HAS',
      _key:
        '89fac263-2430-48fd-9278-dacfdfc89792|has|324e8daa-9c29-42a4-a74b-b9893e6d9750',
      _type: 'azure_group_has_member',
      _mapping: {
        relationshipDirection: RelationshipDirection.FORWARD,
        sourceEntityKey: '89fac263-2430-48fd-9278-dacfdfc89792',
        targetFilterKeys: [['_type', '_key']],
        targetEntity: {
          _key: '324e8daa-9c29-42a4-a74b-b9893e6d9750',
          _type: 'azure_group_member',
          _class: 'User',
          displayName: "Don't really know",
          jobTitle: null,
          email: undefined,
        },
      },
      groupId: '89fac263-2430-48fd-9278-dacfdfc89792',
      memberId: '324e8daa-9c29-42a4-a74b-b9893e6d9750',
      memberType: '#microsoft.graph.directoryObject',
      displayName: 'HAS',
    });
  });
});
