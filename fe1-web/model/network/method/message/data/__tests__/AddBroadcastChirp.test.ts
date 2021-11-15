import 'jest-extended';
import '__tests__/utils/matchers';

import { Base64UrlData, Hash, Timestamp } from 'model/objects';
import { ProtocolError } from 'model/network/ProtocolError';
import { AddBroadcastChirp } from '../chirp/AddBroadcastChirp';
import { ActionType, ObjectType } from '../MessageData';

const TIMESTAMP = new Timestamp(1609455600); // 1st january 2021
const CHANNEL = '/root/abc/social/def';
const mockMessageId = Base64UrlData.encode('message_id');
const ID = new Hash(mockMessageId.toString());

const sampleAddBroadcastChirp: Partial<AddBroadcastChirp> = {
  object: ObjectType.CHIRP,
  action: ActionType.ADD_BROADCAST,
  chirp_id: ID,
  channel: CHANNEL,
  timestamp: TIMESTAMP,
};

const dataAddChirpBroadcast = `{
    "object": "${ObjectType.CHIRP}",
    "action":"${ActionType.ADD_BROADCAST}",
    "chirp_id": "${ID}",
    "channel": "${CHANNEL}",
    "timestamp": ${TIMESTAMP}
  }`;

describe('AddBroadcastChirp', () => {
  it('should be created correctly from JSON', () => {
    expect(new AddBroadcastChirp(sampleAddBroadcastChirp)).toBeJsonEqual(sampleAddBroadcastChirp);
    const temp = {
      object: ObjectType.CHIRP,
      action: ActionType.ADD_BROADCAST,
      chirp_id: ID,
      channel: CHANNEL,
      timestamp: TIMESTAMP,
    };
    expect(new AddBroadcastChirp(temp)).toBeJsonEqual(temp);
  });

  it('should be parsed correctly from JSON', () => {
    const obj = JSON.parse(dataAddChirpBroadcast);
    expect(AddBroadcastChirp.fromJson(obj)).toBeJsonEqual(sampleAddBroadcastChirp);
  });

  it('fromJson should throw an error if the Json has incorrect action', () => {
    const obj = {
      object: ObjectType.CHIRP,
      action: ActionType.CAST_VOTE,
      chirp_id: ID,
      channel: CHANNEL,
      timestamp: TIMESTAMP,
    };
    const createFromJson = () => AddBroadcastChirp.fromJson(obj);
    expect(createFromJson).toThrow(ProtocolError);
  });

  describe('constructor', () => {
    it('should throw an error if id is undefined', () => {
      const createWrongObj = () => new AddBroadcastChirp({
        object: ObjectType.CHIRP,
        action: ActionType.ADD_BROADCAST,
        channel: CHANNEL,
        timestamp: TIMESTAMP,
      });
      expect(createWrongObj).toThrow(ProtocolError);
    });

    it('should throw an error if timestamp is undefined', () => {
      const createWrongObj = () => new AddBroadcastChirp({
        object: ObjectType.CHIRP,
        action: ActionType.ADD_BROADCAST,
        chirp_id: ID,
        channel: CHANNEL,
      });
      expect(createWrongObj).toThrow(ProtocolError);
    });

    it('should throw an error if channel is undefined', () => {
      const createWrongObj = () => new AddBroadcastChirp({
        object: ObjectType.CHIRP,
        action: ActionType.ADD_BROADCAST,
        chirp_id: ID,
        timestamp: TIMESTAMP,
      });
      expect(createWrongObj).toThrow(ProtocolError);
    });
  });
});
