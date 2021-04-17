import 'jest-extended';
import '../utils/matchers';

// @ts-ignore
import testKeyPair from 'test_data/keypair.json';

import * as msApi from 'network/MessageApi';
import * as wsApi from 'network/JsonRpcApi';
import { storeInit } from 'store/Storage';
import { KeyPairStore } from 'store/stores/KeyPairStore';
import { OpenedLaoStore } from 'store/stores/OpenedLaoStore';
import {
  ActionType, CloseRollCall,
  CreateLao, CreateMeeting, CreateRollCall,
  MessageData,
  ObjectType, OpenRollCall, ReopenRollCall,
  StateLao, StateMeeting,
  UpdateLao, WitnessMessage,
} from 'model/network/method/message/data';
import {
  Base64Data, Hash, Lao, PrivateKey, PublicKey, Timestamp, KeyPair,
} from 'model/objects';
import { Channel } from 'model/objects/Channel';

function mockFunction<T extends (...args: any[]) => any>(fn: T): jest.MockedFunction<T> {
  return fn as jest.MockedFunction<T>;
}

jest.mock('store/stores/KeyPairStore');
const keyPairMock = mockFunction(KeyPairStore.get);
keyPairMock.mockImplementation(() => KeyPair.fromState({
  publicKey: testKeyPair.publicKey,
  privateKey: testKeyPair.privateKey,
}));

const publicKeyMock = mockFunction(KeyPairStore.getPublicKey);
publicKeyMock.mockImplementation(() => new PublicKey(testKeyPair.publicKey));

const privateKeyMock = mockFunction(KeyPairStore.getPrivateKey);
privateKeyMock.mockImplementation(() => new PrivateKey(testKeyPair.privateKey));

jest.mock('network/JsonRpcApi.ts');
const publishMock = mockFunction(wsApi.publish);

let mockedFn: (m: MessageData) => Promise<void> = () => Promise.resolve();

// @ts-ignore
publishMock.mockImplementation(
  (channel: Channel, msgData: MessageData) => mockedFn(msgData),
);

function setMockCheck(fn: (m: MessageData) => void) {
  mockedFn = (m: MessageData) => {
    fn(m);
    return Promise.resolve();
  };
}

jest.mock('model/objects/Timestamp');

// real set of keys generated by tweetnacl
export const mockPublicKey = testKeyPair.publicKey;
export const mockSecretKey = testKeyPair.privateKey;

export const mockCurrentLao = JSON.parse('{"jsonrpc":"2.0","method":"publish","params":{"channel":"/root","message":{"data":{"object":"lao","action":"create","id":"4T3gIfBzQINCW8mc1dVtrnfNnawgJxVhrJn8BXqsEG4=","name":"sas","creation":1610730679,"organizer":"xjHAz+d0udy1XfHp5qugskWJVEGZETN/8DV3+ccOFSs=","witnesses":[]},"sender":"xjHAz+d0udy1XfHp5qugskWJVEGZETN/8DV3+ccOFSs=","signature":"7iW6kKwguoSRFo/DB37DusfOG0srcjErte4wKQnS3PHCupcYb9bQXPmOEzKNs6/Q2SqJcNqmqE6hbLGRqTezBw==","message_id":"8/Wg+RGcbDEZwH+PHPHOpcKCyhVgD+MaRj7D/KwVwPo=","witness_signatures":[]}},"id":1}');
export const sampleCreateLaoQuery = '{"jsonrpc":"2.0","method":"publish","params":{"channel":"/root","message":{"data":"eyJvYmplY3QiOiJsYW8iLCJhY3Rpb24iOiJjcmVhdGUiLCJpZCI6InI2bWRsOWxYd2RycytZbXovQWY4M2NPVXpXMU00RTJMMm82LzdRTUdRazQ9IiwibmFtZSI6Im15IGxpbCcgTEFPIDopIiwiY3JlYXRpb24iOjE2MTA3NjI3NDcsIm9yZ2FuaXplciI6InhqSEF6K2QwdWR5MVhmSHA1cXVnc2tXSlZFR1pFVE4vOERWMytjY09GU3M9Iiwid2l0bmVzc2VzIjpbXX0=","sender":"xjHAz+d0udy1XfHp5qugskWJVEGZETN/8DV3+ccOFSs=","signature":"l3KSuJY7pcNAkfKAff29F9U0TYXCEXuBf6YguWneInaKy8/xK722b9YbvePin0eIPU6fjMp2EUp68Zujun+yDg==","message_id":"UMR7xZHjSsExzgve9U3XxU9VVSdNrcCNWZBolkrwiSs=","witness_signatures":[]}},"id":-1}';

export const mockEventName = 'Random Name';
export const mockLocation = 'EPFL';
export const mockCreationTime = new Timestamp(1609455600);
export const mockStartTime = new Timestamp(1735685990);
export const mockEndTime = new Timestamp(1735686000);
export const mockRollCallId = 100;

const defaultDataFields = ['object', 'action'];

function checkDataCreateLao(obj: MessageData) {
  expect(obj.object).toBe(ObjectType.LAO);
  expect(obj.action).toBe(ActionType.CREATE);

  const data: CreateLao = obj as CreateLao;

  expect(data).toBeObject();
  expect(data).toContainKeys([...defaultDataFields, 'id', 'name', 'creation',
    'organizer', 'witnesses']);

  expect(data.id).toBeBase64();

  expect(data.name).toBeString();
  expect(data.name).toBe(mockEventName);

  expect(data.creation).toBeNumberObject();
  expect(data.creation.valueOf()).toBeGreaterThan(0);

  expect(data.organizer).toBeBase64();
  expect(data.organizer).toBeJsonEqual(KeyPairStore.getPublicKey());

  expect(data.witnesses).toBeBase64Array();
  expect(data.witnesses).toBeDistinctArray();

  // check id
  const expected: Hash = Hash.fromStringArray(
    data.organizer.toString(), data.creation.toString(), data.name,
  );
  expect(data.id).toBeJsonEqual(expected);
}

function checkDataUpdateLao(obj: MessageData) {
  expect(obj.object).toBe(ObjectType.LAO);
  expect(obj.action).toBe(ActionType.UPDATE_PROPERTIES);

  const data: UpdateLao = obj as UpdateLao;

  expect(data).toBeObject();
  expect(data).toContainKeys([...defaultDataFields, 'id', 'name', 'last_modified', 'witnesses']);

  expect(data.id).toBeBase64();

  expect(data.name).toBeString();
  expect(data.name).toBe(mockEventName);

  expect(data.last_modified).toBeNumberObject();
  expect(data.last_modified.valueOf()).toBeGreaterThan(0);

  expect(data.witnesses).toBeArray();
  data.witnesses.forEach((wit) => {
    expect(wit).toBeBase64();
  });
  expect(data.witnesses).toHaveLength(new Set(data.witnesses).size);

  // check id
  const expected = Hash.fromStringArray(
    OpenedLaoStore.get().organizer.toString(),
    OpenedLaoStore.get().creation.toString(),
    data.name,
  );
  expect(data.id).toBeJsonEqual(expected);
}

function checkDataStateLao(obj: MessageData) {
  expect(obj.object).toBe(ObjectType.LAO);
  expect(obj.action).toBe(ActionType.STATE);

  const data: StateLao = obj as StateLao;

  expect(data).toBeObject();
  expect(data).toContainKeys([...defaultDataFields, 'id', 'name', 'creation',
    'last_modified', 'organizer', 'witnesses', 'modification_id', 'modification_signatures']);

  expect(data.id).toBeBase64();

  expect(data.name).toBeString();
  expect(data.name).toBe(OpenedLaoStore.get().name);

  expect(data.creation).toBeNumberObject();
  expect(data.creation.valueOf()).toBeGreaterThan(0);

  expect(data.last_modified).toBeNumberObject();
  expect(data.last_modified.valueOf()).toBeGreaterThan(0);
  expect(data.last_modified.valueOf() + 1).toBeGreaterThan(data.creation.valueOf());

  expect(data.organizer).toBeBase64();
  expect(data.organizer).toBeJsonEqual(OpenedLaoStore.get().organizer);

  expect(data.witnesses).toBeBase64Array();
  expect(data.witnesses).toBeDistinctArray();

  expect(data.modification_id).toBeBase64();

  expect(data.modification_signatures).toBeKeySignatureArray('witness', 'signature');

  // check id
  const expected = Hash.fromStringArray(
    data.organizer.toString(), OpenedLaoStore.get().creation.toString(), data.name,
  );
  expect(data.id).toBeJsonEqual(expected);
}

function checkDataCreateMeeting(obj: MessageData) {
  expect(obj.object).toBe(ObjectType.MEETING);
  expect(obj.action).toBe(ActionType.CREATE);

  const data: CreateMeeting = obj as CreateMeeting;

  expect(data).toBeObject();
  const expectedMinFields = [...defaultDataFields, 'id', 'name', 'creation', 'start'];
  expect(data).toContainKeys(expectedMinFields);

  expect(data.id).toBeBase64();

  expect(data.name).toBeString();
  expect(data.name).toBe(mockEventName);

  expect(data.creation).toBeNumberObject();
  expect(data.creation.valueOf()).toBeGreaterThan(0);

  if ('location' in data) {
    expect(data.location).toBeString();
    expect(data.location).toBe(mockLocation);
  }

  expect(data.start).toBeNumberObject();
  expect(data.start.valueOf()).toBeGreaterThan(0);
  expect(data.start.valueOf()).toBeGreaterThanOrEqual(data.creation.valueOf());

  if ('end' in data) {
    expect(data.end).toBeNumberObject();
    // @ts-ignore
    expect(data.end.valueOf()).toBeGreaterThan(0);
    // @ts-ignore
    expect(data.end.valueOf() + 1).toBeGreaterThan(data.start.valueOf());
  }

  if ('extra' in data) {
    expect(data.extra).toBeObject();
  }

  // check id
  const expected = Hash.fromStringArray('M', OpenedLaoStore.get().id.toString(), OpenedLaoStore.get().creation.toString(), data.name);
  expect(data.id).toEqual(expected);
}

// FIXME remove eslint warning when function used
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function checkDataStateMeeting(obj: MessageData) {
  expect(obj.object).toBe(ObjectType.MEETING);
  expect(obj.action).toBe(ActionType.STATE);

  const data: StateMeeting = obj as StateMeeting;

  expect(data).toBeObject();
  const expectedMinFields = [...defaultDataFields, 'id', 'name', 'creation',
    'last_modified', 'start', 'modification_id', 'modification_signatures'];
  expect(data).toContainKeys(expectedMinFields);

  expect(data.id).toBeBase64();

  expect(data.name).toBeString();
  expect(data.name).toBe(mockCurrentLao.params.message.data.name);

  expect(data.creation).toBeNumberObject();
  expect(data.creation.valueOf()).toBeGreaterThan(0);

  expect(data.last_modified).toBeNumberObject();
  expect(data.last_modified.valueOf()).toBeGreaterThan(0);
  expect(data.last_modified.valueOf() + 1).toBeGreaterThan(data.creation.valueOf());

  if ('location' in data) {
    expect(data.location).toBeString();
    expect(data.location).toBe(mockLocation);
  }

  expect(data.start).toBeNumberObject();
  expect(data.start.valueOf()).toBeGreaterThan(0);
  expect(data.start.valueOf() + 1).toBeGreaterThan(data.creation.valueOf());

  if ('end' in data) {
    expect(data.end).toBeNumberObject();
    expect(data.end?.valueOf()).toBeGreaterThan(0);
    // @ts-ignore
    expect(data.end.valueOf() + 1).toBeGreaterThan(data.start.valueOf());
  }

  if ('extra' in data) {
    expect(data.extra).toBeObject();
  }

  expect(data.modification_id).toBeBase64();

  expect(data.modification_signatures).toBeKeySignatureArray('witness', 'signature');

  // check id
  const expected = Hash.fromStringArray('M', OpenedLaoStore.get().id.toString(), OpenedLaoStore.get().creation.toString(), data.name);
  expect(data.id).toEqual(expected);
}

function checkDataWitnessMessage(obj: MessageData) {
  expect(obj.object).toBe(ObjectType.MESSAGE);
  expect(obj.action).toBe(ActionType.WITNESS);

  const data: WitnessMessage = obj as WitnessMessage;

  expect(data).toContainKeys([...defaultDataFields, 'message_id', 'signature']);
  expect(data.message_id).toBeBase64();
  expect(data.signature).toBeBase64();
}

function checkDataCreateRollCall(obj: MessageData) {
  expect(obj.object).toBe(ObjectType.ROLL_CALL);
  expect(obj.action).toBe(ActionType.CREATE);

  const data: CreateRollCall = obj as CreateRollCall;

  expect(data).toBeObject();
  expect(data).toContainKeys([...defaultDataFields, 'id', 'name', 'creation', 'location', 'proposed_start', 'proposed_end']);

  expect(data.id).toBeBase64();

  expect(data.name).toBeString();
  expect(data.name).toBe(mockEventName);

  expect(data.creation).toBeNumberObject();
  expect(data.creation.valueOf()).toBeGreaterThan(0);

  if ('proposed_start' in data) {
    expect(data.proposed_start).toBeNumberObject();
    // @ts-ignore
    expect(data.proposed_start.valueOf()).toBeGreaterThan(0);
    // @ts-ignore
    expect(data.proposed_start.valueOf() + 1).toBeGreaterThan(data.creation.valueOf());
  }

  if ('proposed_end' in data) {
    expect(data.proposed_end).toBeNumberObject();
    // @ts-ignore
    expect(data.proposed_end.valueOf()).toBeGreaterThan(0);
    // @ts-ignore
    expect(data.proposed_end.valueOf() + 1).toBeGreaterThan(data.creation.valueOf());
  }

  expect(data.location).toBeString();
  expect(data.location).toBe(mockLocation);

  if ('description' in data) {
    expect(data.description).toBeString();
  }

  // check id
  const expected = Hash.fromStringArray('R', OpenedLaoStore.get().id.toString(), data.creation.toString(), data.name);
  expect(data.id).toEqual(expected);
}

// FIXME remove eslint warning when function used
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function checkDataOpenRollCall(obj: MessageData) {
  expect(obj.object).toBe(ObjectType.ROLL_CALL);
  expect(obj.action).toBe(ActionType.OPEN);

  const data: OpenRollCall = obj as OpenRollCall;

  expect(data).toBeObject();
  expect(data).toContainKeys([...defaultDataFields, 'update_id', 'opened_at']);

  expect(data.update_id).toBeBase64();

  expect(data.opened_at).toBeNumberObject();
  expect(data.opened_at.valueOf()).toBeGreaterThan(0);

  // check id
  const expected = Hash.fromStringArray('R', OpenedLaoStore.get().id.toString(), '444', 'r-cName'); // 444 and r-cName are for now hardocded in the APi
  expect(data.update_id).toEqual(expected);
}

// FIXME remove eslint warning when function used
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function checkDataReopenRollCall(obj: MessageData) {
  expect(obj.object).toBe(ObjectType.ROLL_CALL);
  expect(obj.action).toBe(ActionType.REOPEN);

  const data: ReopenRollCall = obj as ReopenRollCall;

  expect(data).toContainKeys([...defaultDataFields, 'id', 'opened_at']);

  expect(data.update_id).toBeBase64();

  expect(data.opened_at).toBeNumberObject();
  expect(data.opened_at.valueOf()).toBeGreaterThan(0);

  // check id
  const expected = Hash.fromStringArray('R', OpenedLaoStore.get().id.toString(), '444', 'r-cName'); // 444 and r-cName are for now hardocded in the APi
  expect(data.update_id).toEqual(expected);
}

// FIXME remove eslint warning when function used
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function checkDataCloseRollCall(obj: MessageData) {
  expect(obj.object).toBe(ObjectType.ROLL_CALL);
  expect(obj.action).toBe(ActionType.CLOSE);

  const data: CloseRollCall = obj as CloseRollCall;

  expect(data).toBeObject();
  expect(data).toContainKeys([...defaultDataFields, 'update_id', 'closes', 'closed_at', 'attendees']);

  expect(data.update_id).toBeBase64();

  expect(data.closed_at).toBeNumberObject();
  expect(data.closed_at.valueOf()).toBeGreaterThan(0);

  expect(data.attendees).toBeBase64Array();
  expect(data.attendees).toBeDistinctArray();

  // check id
  const expected = Hash.fromStringArray('R', OpenedLaoStore.get().id.toString(), '444', 'r-cName'); // 444 and r-cName are for now hardocded in the APi
  expect(data.update_id).toEqual(expected);
}

describe('=== WebsocketApi tests ===', () => {
  beforeEach(() => {
    storeInit();

    const org: PublicKey = KeyPairStore.getPublicKey();
    const time: Timestamp = Timestamp.EpochNow();
    const name: string = 'Pop\'s LAO';
    const sampleLao: Lao = new Lao({
      name,
      id: Hash.fromStringArray(org.toString(), time.toString(), name),
      creation: time,
      last_modified: time,
      organizer: org,
      witnesses: [],
    });

    OpenedLaoStore.store(sampleLao);
  });

  /* NOTE: checks are done in checkRequests since msApi.request* return void */

  describe('network.WebsocketApi', () => {
    it('should create the correct request for requestCreateLao', async () => {
      setMockCheck(checkDataCreateLao);
      await msApi.requestCreateLao(mockEventName);
    });

    it('should create the correct request for requestUpdateLao', async () => {
      setMockCheck(checkDataUpdateLao);
      await msApi.requestUpdateLao(mockEventName);
    });

    it('should create the correct request for requestStateLao', async () => {
      setMockCheck(checkDataStateLao);
      await msApi.requestStateLao();
    });

    it('should create the correct request for requestCreateMeeting', async () => {
      setMockCheck(checkDataCreateMeeting);
      const mockExtra = { numberParticipants: 12, minAge: 18 };
      await msApi.requestCreateMeeting(mockEventName, mockStartTime);
      await msApi.requestCreateMeeting(mockEventName, mockStartTime, mockLocation);
      await msApi.requestCreateMeeting(mockEventName, mockStartTime, mockLocation, mockEndTime);
      await msApi.requestCreateMeeting(
        mockEventName, mockStartTime, mockLocation, mockEndTime, mockExtra,
      );
    });
    /*
    it('should create the correct request for requestStateMeeting', function () {
      await msApi.requestStateMeeting(mockStartTime);
    });
*/
    it('should create the correct request for requestWitnessMessage', async () => {
      setMockCheck(checkDataWitnessMessage);
      await msApi.requestWitnessMessage('/root', Base64Data.encode('randomMessageId'));
    });

    it('should create the correct request for requestCreateRollCall', async () => {
      setMockCheck(checkDataCreateRollCall);
      const mockScheduledTime = new Timestamp(mockStartTime.valueOf() + 1);
      const mockDescription = 'random description';
      await msApi.requestCreateRollCall(mockEventName, mockLocation, mockStartTime);
      await msApi.requestCreateRollCall(mockEventName, mockLocation, undefined, mockScheduledTime);
      await msApi.requestCreateRollCall(
        mockEventName, mockLocation, mockStartTime, undefined, mockDescription,
      );
      await msApi.requestCreateRollCall(
        mockEventName, mockLocation, undefined, mockScheduledTime, mockDescription,
      );
    });
    /*
    it('should create the correct request for requestOpenRollCall', function () {
      await msApi.requestOpenRollCall(mockRollCallId);
      await msApi.requestOpenRollCall(mockRollCallId, mockStartTime);
    });

    it('should create the correct request for requestReopenRollCall', function () {
      await msApi.requestReopenRollCall(mockRollCallId);
      await msApi.requestReopenRollCall(mockRollCallId, mockStartTime);
    });

    it('should create the correct request for requestCloseRollCall', function () {
      await msApi.requestCloseRollCall(mockRollCallId, []);
      await msApi.requestCloseRollCall(mockRollCallId, [
        'xjHAz+d0udy1XfHp5qugskWJVEGZETN/8DV3+ccOFSs=',
        'mK0eAXHPPlxySr1erjOhZNlKz34/+nJ1hi1Sph66fas='
      ]);
    }); */
  });
});
