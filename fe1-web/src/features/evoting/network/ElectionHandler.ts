import { ExtendedMessage } from 'core/network/messages';
import { ActionType, MessageRegistry, ObjectType } from 'core/network/messages';
import { channelFromIds, getLastPartOfChannel } from 'core/objects';
import { dispatch, getStore, KeyPairStore } from 'store';
import { subscribeToChannel } from 'core/network/CommunicationApi';
import { addEvent, updateEvent } from 'features/events/reducer';
import { getEventFromId } from 'features/events/network/EventHandlerUtils';
import { makeCurrentLao } from 'features/lao/reducer';

import { CastVote, ElectionResult, EndElection, SetupElection } from './messages';
import { Election, ElectionStatus, RegisteredVote } from '../objects';

/**
 * Handles all election related messages coming from the network.
 */

const getCurrentLao = makeCurrentLao();

/**
 * Handles an ElectionSetup message by setting up the election in the current Lao.
 *
 * @param msg - The extended message for setting up an election
 */
function handleElectionSetupMessage(msg: ExtendedMessage): boolean {
  if (
    msg.messageData.object !== ObjectType.ELECTION ||
    msg.messageData.action !== ActionType.SETUP
  ) {
    console.warn('handleElectionSetupMessage was called to process an unsupported message', msg);
    return false;
  }

  const makeErr = (err: string) => `election/setup was not processed: ${err}`;

  const storeState = getStore().getState();
  const lao = getCurrentLao(storeState);
  if (!lao) {
    console.warn(makeErr('no LAO is currently active'));
    return false;
  }

  const elecMsg = msg.messageData as SetupElection;

  const election = new Election({
    lao: elecMsg.lao,
    id: elecMsg.id,
    name: elecMsg.name,
    version: elecMsg.version,
    createdAt: elecMsg.created_at,
    start: elecMsg.start_time,
    end: elecMsg.end_time,
    questions: elecMsg.questions,
    registeredVotes: [],
  });

  // Subscribing to the election channel corresponding to that election
  const electionChannel = channelFromIds(election.lao, election.id);
  subscribeToChannel(electionChannel).catch((err) => {
    console.error('Could not subscribe to Election channel, error:', err);
  });

  dispatch(addEvent(lao.id, election.toState()));
  return true;
}

/**
 * Handles a CastVote message being sent during an election.
 *
 * @param msg - The extended message to cast a vote
 */
function handleCastVoteMessage(msg: ExtendedMessage): boolean {
  if (
    msg.messageData.object !== ObjectType.ELECTION ||
    msg.messageData.action !== ActionType.CAST_VOTE
  ) {
    console.warn('handleCastVoteMessage was called to process an unsupported message', msg);
    return false;
  }
  const makeErr = (err: string) => `election/cast-vote was not processed: ${err}`;
  const storeState = getStore().getState();
  const lao = getCurrentLao(storeState);
  if (!lao) {
    console.warn(makeErr('no LAO is currently active'));
    return false;
  }
  const myPublicKey = KeyPairStore.getPublicKey();
  const isOrganizer = lao.organizer.equals(myPublicKey);
  const isWitness = lao.witnesses.some((w) => w.equals(myPublicKey));
  if (!isOrganizer && !isWitness) {
    // Then current user is an attendee and doesn't have to store the votes
    return true;
  }

  const castVoteMsg = msg.messageData as CastVote;
  const currentVote: RegisteredVote = {
    createdAt: castVoteMsg.created_at,
    sender: msg.sender,
    votes: castVoteMsg.votes,
    messageId: msg.message_id,
  };
  const election = getEventFromId(storeState, castVoteMsg.election) as Election;
  if (!election) {
    console.warn(makeErr('No active election to register vote '));
    return false;
  }

  if (
    election.registeredVotes.some(
      (votes) => votes.sender.toString() === currentVote.sender.toString(),
    )
  ) {
    // Update the vote if the person has already voted before
    election.registeredVotes = election.registeredVotes.map((prevVote) =>
      prevVote.sender.toString() === currentVote.sender.toString() &&
      prevVote.createdAt.valueOf() < currentVote.createdAt.valueOf()
        ? currentVote
        : prevVote,
    );
  } else {
    election.registeredVotes = [...election.registeredVotes, currentVote];
  }
  dispatch(updateEvent(lao.id, election.toState()));
  return true;
}

/**
 * Handles an ElectionEnd message by ending the election.
 *
 * @param msg - The extended message for ending an election
 */
function handleElectionEndMessage(msg: ExtendedMessage) {
  console.log('Handling Election end message');
  if (msg.messageData.object !== ObjectType.ELECTION || msg.messageData.action !== ActionType.END) {
    console.warn('handleElectionEndMessage was called to process an unsupported message', msg);
    return false;
  }
  const makeErr = (err: string) => `election/end was not processed: ${err}`;
  const storeState = getStore().getState();
  const lao = getCurrentLao(storeState);
  if (!lao) {
    console.warn(makeErr('no LAO is currently active'));
    return false;
  }
  const ElectionEndMsg = msg.messageData as EndElection;
  const election = getEventFromId(storeState, ElectionEndMsg.election) as Election;
  if (!election) {
    console.warn(makeErr('No active election to end'));
    return false;
  }

  // Change election status here such that it will change the election display in the event list
  election.electionStatus = ElectionStatus.TERMINATED;
  dispatch(updateEvent(lao.id, election.toState()));
  return true;
}

/**
 * Handles an ElectionResult message by updating the election's state with its results.
 *
 * @param msg - The extended message for getting the election's results.
 */
function handleElectionResultMessage(msg: ExtendedMessage) {
  if (
    msg.messageData.object !== ObjectType.ELECTION ||
    msg.messageData.action !== ActionType.RESULT
  ) {
    console.warn('handleElectionResultMessage was called to process an unsupported message', msg);
    return false;
  }
  const makeErr = (err: string) => `election/Result was not processed: ${err}`;
  const storeState = getStore().getState();
  const lao = getCurrentLao(storeState);
  if (!lao) {
    console.warn(makeErr('no LAO is currently active'));
    return false;
  }
  if (!msg.channel) {
    console.warn(makeErr('No channel found in message'));
    return false;
  }
  const electionId = getLastPartOfChannel(msg.channel);
  const ElectionResultMsg = msg.messageData as ElectionResult;
  const election = getEventFromId(storeState, electionId) as Election;
  if (!election) {
    console.warn(makeErr('No active election for the result'));
    return false;
  }

  election.questionResult = ElectionResultMsg.questions;
  election.electionStatus = ElectionStatus.RESULT;
  dispatch(updateEvent(lao.id, election.toState()));
  console.log('received election Result message: ', ElectionResultMsg);
  return true;
}

/**
 * Configures the ElectionHandler in a MessageRegistry.
 *
 * @param registry - The MessageRegistry where we want to add the mappings
 */
export function configure(registry: MessageRegistry) {
  registry.addHandler(ObjectType.ELECTION, ActionType.SETUP, handleElectionSetupMessage);
  registry.addHandler(ObjectType.ELECTION, ActionType.CAST_VOTE, handleCastVoteMessage);
  registry.addHandler(ObjectType.ELECTION, ActionType.END, handleElectionEndMessage);
  registry.addHandler(ObjectType.ELECTION, ActionType.RESULT, handleElectionResultMessage);
}
