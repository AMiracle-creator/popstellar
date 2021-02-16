import { Hash, Timestamp, Lao } from 'model/objects';
import { OpenedLaoStore } from 'store';
import { ProtocolError } from 'model/network/ProtocolError';
import { ActionType, MessageData, ObjectType } from '../MessageData';
import { checkTimestampStaleness } from '../Checker';

export class CreateMeeting implements MessageData {
  public readonly object: ObjectType = ObjectType.MEETING;

  public readonly action: ActionType = ActionType.CREATE;

  public readonly id: Hash;

  public readonly name: string;

  public readonly creation: Timestamp;

  public readonly location?: string;

  public readonly start: Timestamp;

  public readonly end?: Timestamp;

  public readonly extra?: {};

  constructor(msg: Partial<CreateMeeting>) {
    if (!msg.name) throw new ProtocolError('Undefined \'name\' parameter encountered during \'CreateMeeting\'');
    this.name = msg.name;

    if (!msg.creation) throw new ProtocolError('Undefined \'creation\' parameter encountered during \'CreateMeeting\'');
    checkTimestampStaleness(msg.creation);
    this.creation = msg.creation;

    if (msg.location) this.location = msg.location;

    if (!msg.start) throw new ProtocolError('Undefined \'start\' parameter encountered during \'CreateMeeting\'');
    checkTimestampStaleness(msg.start);
    this.start = msg.start;

    if (msg.end) {
      if (msg.end < msg.creation) throw new ProtocolError('Invalid timestamp encountered: \'end\' parameter smaller than \'creation\'');
      this.end = msg.end;
    }

    if (msg.extra) this.extra = JSON.parse(JSON.stringify(msg.extra)); // clone JS object extra

    if (!msg.id) throw new ProtocolError('Undefined \'id\' parameter encountered during \'CreateMeeting\'');
    const lao: Lao = OpenedLaoStore.get();
    /* // FIXME get event from storage
    const expectedHash = Hash.fromStringArray(
      eventTags.MEETING, lao.id.toString(), lao.creation.toString(), MEETING_NAME,
    );
    if (!expectedHash.equals(msg.id))
      throw new ProtocolError(
        'Invalid \'id\' parameter encountered during \'CreateMeeting\': unexpected id value'
      ); */
    this.id = msg.id;
  }

  public static fromJson(obj: any): CreateMeeting {
    // FIXME add JsonSchema validation to all "fromJson"
    const correctness = true;

    return correctness
      ? new CreateMeeting({
        ...obj,
        creation: new Timestamp(obj.creation),
        start: new Timestamp(obj.start),
        end: (obj.end !== undefined) ? new Timestamp(obj.end) : undefined,
        id: new Hash(obj.id),
      })
      : (() => { throw new ProtocolError('add JsonSchema error message'); })();
  }
}
