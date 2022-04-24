import { ActionType, MessageData, ObjectType } from 'core/network/jsonrpc/messages';
import { ProtocolError } from 'core/objects';

const { LAO, MEETING, ROLL_CALL, ELECTION, MESSAGE, CHIRP, REACTION } = ObjectType;
const {
  CREATE,
  STATE,
  UPDATE_PROPERTIES,
  OPEN,
  CLOSE,
  REOPEN,
  SETUP,
  CAST_VOTE,
  END,
  RESULT,
  WITNESS,
  ADD,
  NOTIFY_ADD,
  DELETE,
  NOTIFY_DELETE,
} = ActionType;

export enum WitnessingType {
  NO_WITNESSING = 'NO_WITNESSING',
  PASSIVE = 'PASSIVE',
  ACTIVE = 'ACTIVE',
}

export interface WitnessEntry {
  type: WitnessingType;
}

const k = (...args: string[]) => args.join(',');

const WITNESSING_TYPE_MAP = new Map<string, WitnessEntry>([
  // Lao
  [k(LAO, CREATE), { type: WitnessingType.NO_WITNESSING }],
  [k(LAO, STATE), { type: WitnessingType.NO_WITNESSING }],
  [k(LAO, UPDATE_PROPERTIES), { type: WitnessingType.NO_WITNESSING }],

  // Meeting
  [k(MEETING, CREATE), { type: WitnessingType.NO_WITNESSING }],
  [k(MEETING, STATE), { type: WitnessingType.NO_WITNESSING }],

  // Roll call
  [k(ROLL_CALL, CREATE), { type: WitnessingType.NO_WITNESSING }],
  [k(ROLL_CALL, OPEN), { type: WitnessingType.NO_WITNESSING }],
  [k(ROLL_CALL, CLOSE), { type: WitnessingType.NO_WITNESSING }],
  [k(ROLL_CALL, REOPEN), { type: WitnessingType.NO_WITNESSING }],

  // Election
  [k(ELECTION, SETUP), { type: WitnessingType.NO_WITNESSING }],
  [k(ELECTION, OPEN), { type: WitnessingType.NO_WITNESSING }],
  [k(ELECTION, CAST_VOTE), { type: WitnessingType.PASSIVE }],
  [k(ELECTION, END), { type: WitnessingType.NO_WITNESSING }],
  [k(ELECTION, RESULT), { type: WitnessingType.NO_WITNESSING }],

  // Witness
  [k(MESSAGE, WITNESS), { type: WitnessingType.NO_WITNESSING }],

  // Chirps
  [k(CHIRP, ADD), { type: WitnessingType.PASSIVE }],
  [k(CHIRP, NOTIFY_ADD), { type: WitnessingType.NO_WITNESSING }],
  [k(CHIRP, DELETE), { type: WitnessingType.PASSIVE }],
  [k(CHIRP, NOTIFY_DELETE), { type: WitnessingType.NO_WITNESSING }],

  // Reactions
  [k(REACTION, ADD), { type: WitnessingType.PASSIVE }],
]);

const getWitnessRegistryEntry = (data: MessageData): WitnessEntry => {
  const key = k(data.object, data.action);
  const messageEntry = WITNESSING_TYPE_MAP.get(key);
  if (messageEntry === undefined) {
    throw new ProtocolError(`Message '${key}' is not contained in WitnessRegistry`);
  }
  return messageEntry;
};

export const getWitnessRegistryEntryType = (data: MessageData): WitnessingType =>
  getWitnessRegistryEntry(data).type;
