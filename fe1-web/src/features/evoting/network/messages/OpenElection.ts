import { Hash, Timestamp, ProtocolError } from 'core/objects';
import { validateDataObject } from 'core/network/validation';
import { ActionType, MessageData, ObjectType } from 'core/network/jsonrpc/messages';
import { checkTimestampStaleness } from 'core/network/validation/Checker';
import { MessageDataProperties } from 'core/types';
import { Election } from 'features/evoting/objects';

/** Data sent to end an Election event */
export class OpenElection implements MessageData {
  public readonly object: ObjectType = ObjectType.ELECTION;

  public readonly action: ActionType = ActionType.OPEN;

  public readonly lao: Hash;

  public readonly election: Hash;

  public readonly opened_at: Timestamp;

  constructor(msg: MessageDataProperties<OpenElection>) {
    if (!msg.lao) {
      throw new ProtocolError("Undefined 'lao' parameter encountered during 'OpenElection'");
    }
    this.lao = msg.lao;

    if (!msg.opened_at) {
      throw new ProtocolError("Undefined 'opened_at' parameter encountered during 'OpenElection'");
    }
    checkTimestampStaleness(msg.opened_at);
    this.opened_at = msg.opened_at;

    if (!msg.election) {
      throw new ProtocolError("Invalid 'election' parameter encountered during 'OpenElection'");
    }
    this.election = msg.election;
  }

  /**
   * Creates an OpenElection object from a given object.
   *
   * @param obj
   */
  public static fromJson(obj: any): OpenElection {
    const { errors } = validateDataObject(ObjectType.ELECTION, ActionType.OPEN, obj);

    if (errors !== null) {
      throw new ProtocolError(`Invalid election#open\n\n${errors}`);
    }

    return new OpenElection({
      lao: new Hash(obj.lao),
      election: new Hash(obj.election),
      opened_at: new Timestamp(obj.opened_at),
    });
  }

  public static computeRegisteredVotesHash(election: Election) {
    const sortedVoteIds = election.registeredVotes
      // First sort by timestamp, than by message ID as tiebreaker
      .sort((a, b) => {
        const tiebreaker = a.messageId.valueOf() < b.messageId.valueOf() ? -1 : 1;
        return a !== b ? a.createdAt - b.createdAt : tiebreaker;
      })
      // Now expand each registered vote to the contained vote ids
      // flatMap = map + flatten array
      .flatMap((registeredVote) => registeredVote.votes.map((vote) => vote.id));

    return Hash.fromStringArray(...sortedVoteIds);
  }
}
