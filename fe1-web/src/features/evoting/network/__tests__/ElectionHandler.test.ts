import 'jest-extended';
import '__tests__/utils/matchers';

import {
  configureTestFeatures,
  mockKeyPair,
  mockLao,
  mockLaoId,
  mockLaoIdHash,
  mockPopToken,
} from '__tests__/utils';
import { KeyPairStore } from 'core/keypair';
import { subscribeToChannel } from 'core/network';
import { ActionType, MessageData, ObjectType } from 'core/network/jsonrpc/messages';
import {
  Base64UrlData,
  channelFromIds,
  getLastPartOfChannel,
  Hash,
  ROOT_CHANNEL,
  Signature,
  Timestamp,
} from 'core/objects';
import { dispatch } from 'core/redux';
import {
  mockElectionId,
  mockElectionNotStarted,
  mockElectionOpened,
  mockElectionResultQuestions,
  mockElectionTerminated,
  mockRegistedVotesHash,
  mockVote1,
  mockVote2,
} from 'features/evoting/__tests__/utils';

import { Election, ElectionStatus, RegisteredVote } from '../../objects';
import {
  handleCastVoteMessage,
  handleElectionEndMessage,
  handleElectionOpenMessage,
  handleElectionResultMessage,
  handleElectionSetupMessage,
} from '../ElectionHandler';
import { CastVote, ElectionResult, EndElection, SetupElection } from '../messages';
import { OpenElection } from '../messages/OpenElection';

const TIMESTAMP = new Timestamp(1609455600); // 1st january 2021

const mockMessageData = {
  receivedAt: TIMESTAMP,
  receivedFrom: 'some address',
  laoId: mockLaoIdHash,
  data: Base64UrlData.encode('some data'),
  sender: mockKeyPair.publicKey,
  signature: Base64UrlData.encode('some data') as Signature,
  channel: `${ROOT_CHANNEL}/${mockLaoId}/${mockElectionId.valueOf()}`,
  message_id: Hash.fromString('some string'),
  witness_signatures: [],
};

const mockGetCurrentLao = jest.fn(() => mockLao);
const mockGetEventById = jest.fn();
const mockUpdateEvent = jest.fn();

// mock channelFromIds and subscribeToChannel (spyOn does not work)
const mockChannelId = 'someChannelId';

jest.mock('core/objects', () => {
  return {
    ...jest.requireActual('core/objects'),
    channelFromIds: jest.fn(() => mockChannelId),
  };
});

jest.mock('core/network', () => {
  return {
    ...jest.requireActual('core/network'),
    subscribeToChannel: jest.fn(() => Promise.resolve()),
  };
});

beforeAll(() => {
  configureTestFeatures();
});

beforeEach(() => {
  // clear data in the redux store
  dispatch({ type: 'CLEAR_STORAGE', value: {} });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('ElectionHandler', () => {
  describe('election#setup', () => {
    it('should return false if the object is not "election"', () => {
      const addEvent = jest.fn();

      expect(
        handleElectionSetupMessage(addEvent)({
          ...mockMessageData,
          messageData: {
            object: ObjectType.CHIRP,
            action: ActionType.SETUP,
          },
        }),
      ).toBeFalse();
    });

    it('should return false if the action is not "setup"', () => {
      const addEvent = jest.fn();

      expect(
        handleElectionSetupMessage(addEvent)({
          ...mockMessageData,
          messageData: {
            object: ObjectType.ELECTION,
            action: ActionType.ADD,
          },
        }),
      ).toBeFalse();
    });

    it('should return false if the message is not received on a lao channel', () => {
      const addEvent = jest.fn();

      expect(
        handleElectionSetupMessage(addEvent)({
          ...mockMessageData,
          laoId: undefined,
          messageData: new SetupElection(
            {
              lao: mockLaoIdHash,
              id: mockElectionNotStarted.id,
              name: mockElectionNotStarted.name,
              version: mockElectionNotStarted.version,
              created_at: mockElectionNotStarted.createdAt,
              start_time: mockElectionNotStarted.start,
              end_time: mockElectionNotStarted.end,
              questions: mockElectionNotStarted.questions,
            },
            mockLaoIdHash,
          ),
        }),
      ).toBeFalse();
    });

    it('should create the election', () => {
      const addEvent = jest.fn();

      expect(
        handleElectionSetupMessage(addEvent)({
          ...mockMessageData,
          messageData: new SetupElection(
            {
              lao: mockLaoIdHash,
              id: mockElectionNotStarted.id,
              name: mockElectionNotStarted.name,
              version: mockElectionNotStarted.version,
              created_at: mockElectionNotStarted.createdAt,
              start_time: mockElectionNotStarted.start,
              end_time: mockElectionNotStarted.end,
              questions: mockElectionNotStarted.questions,
            },
            mockLaoIdHash,
          ),
        }),
      ).toBeTrue();

      // it should have been subscripted to the election channel
      expect(channelFromIds).toHaveBeenCalledTimes(1);
      expect(channelFromIds).toHaveBeenCalledWith(
        mockElectionNotStarted.lao,
        mockElectionNotStarted.id,
      );

      expect(subscribeToChannel).toHaveBeenCalledTimes(1);
      expect(subscribeToChannel).toHaveBeenCalledWith(mockChannelId);

      // check whether addEvent has been called correctly
      expect(addEvent).toHaveBeenCalledWith(mockLaoIdHash, mockElectionNotStarted);
      expect(addEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('election#open', () => {
    it('should return false if the object is not "election"', () => {
      expect(
        handleElectionOpenMessage(
          mockGetEventById,
          mockUpdateEvent,
        )({
          ...mockMessageData,
          messageData: {
            object: ObjectType.CHIRP,
            action: ActionType.OPEN,
          },
        }),
      ).toBeFalse();
    });

    it('should return false if the action is not "open"', () => {
      expect(
        handleElectionOpenMessage(
          mockGetEventById,
          mockUpdateEvent,
        )({
          ...mockMessageData,
          messageData: {
            object: ObjectType.ELECTION,
            action: ActionType.ADD,
          },
        }),
      ).toBeFalse();
    });

    it('should return false if the message is not received on a lao channel', () => {
      expect(
        handleElectionOpenMessage(
          jest.fn(),
          jest.fn(),
        )({
          ...mockMessageData,
          laoId: undefined,
          messageData: new OpenElection({
            lao: mockLaoIdHash,
            election: mockElectionId,
            opened_at: TIMESTAMP,
          }),
        }),
      ).toBeFalse();
    });

    it('should return false if the election has not previously been stored', () => {
      expect(
        handleElectionOpenMessage(
          mockGetEventById,
          mockUpdateEvent,
        )({
          ...mockMessageData,
          messageData: {
            object: ObjectType.ELECTION,
            action: ActionType.OPEN,
            election: mockElectionId.valueOf(),
            created_at: TIMESTAMP,
          } as MessageData,
        }),
      ).toBeFalse();
    });

    it('should update the election status', () => {
      const getEventById = jest.fn(() => Election.fromState(mockElectionNotStarted.toState()));
      const updateEvent = jest.fn();

      expect(
        handleElectionOpenMessage(
          getEventById,
          updateEvent,
        )({
          ...mockMessageData,
          messageData: new OpenElection({
            lao: mockLaoIdHash,
            election: mockElectionId,
            opened_at: TIMESTAMP,
          }),
        }),
      ).toBeTrue();

      // check whether getEventById has been called correctly
      expect(getEventById).toHaveBeenCalledWith(mockElectionId);
      expect(getEventById).toHaveBeenCalledTimes(1);

      // check whether updateEvent has been called correctly
      const updatedElection = Election.fromState(mockElectionNotStarted.toState());
      updatedElection.electionStatus = ElectionStatus.OPENED;

      expect(updateEvent).toHaveBeenCalledWith(updatedElection);
      expect(updateEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('election#castVote', () => {
    it('should return false if the object is not "election"', () => {
      expect(
        handleCastVoteMessage(
          mockGetCurrentLao,
          mockGetEventById,
          mockUpdateEvent,
        )({
          ...mockMessageData,
          messageData: {
            object: ObjectType.CHIRP,
            action: ActionType.CAST_VOTE,
          },
        }),
      ).toBeFalse();
    });

    it('should return false if the action is not "cast_vote"', () => {
      expect(
        handleCastVoteMessage(
          mockGetCurrentLao,
          mockGetEventById,
          mockUpdateEvent,
        )({
          ...mockMessageData,
          messageData: {
            object: ObjectType.ELECTION,
            action: ActionType.ADD,
          },
        }),
      ).toBeFalse();
    });

    it('should return false if the message is not received on a lao channel', () => {
      expect(
        handleCastVoteMessage(
          mockGetCurrentLao,
          jest.fn(),
          jest.fn(),
        )({
          ...mockMessageData,
          laoId: undefined,
          messageData: new CastVote({
            lao: mockLaoIdHash,
            election: mockElectionId,
            created_at: TIMESTAMP,
            votes: [mockVote1, mockVote2],
          }),
        }),
      ).toBeFalse();
    });

    it('for attendees should return false if the election has not previously been stored', () => {
      // stores the keypair of somebody else
      KeyPairStore.store(mockPopToken);

      expect(
        handleCastVoteMessage(
          mockGetCurrentLao,
          mockGetEventById,
          mockUpdateEvent,
        )({
          ...mockMessageData,
          messageData: {
            object: ObjectType.ELECTION,
            action: ActionType.CAST_VOTE,
            election: mockElectionId.valueOf(),
            opened_at: TIMESTAMP,
          } as MessageData,
        }),
      ).toBeTrue();
    });

    it('for organizers should return false if the election has not previously been stored', () => {
      // stores the keypair of the mockLao organizer
      KeyPairStore.store(mockKeyPair);

      expect(
        handleCastVoteMessage(
          mockGetCurrentLao,
          mockGetEventById,
          mockUpdateEvent,
        )({
          ...mockMessageData,
          messageData: {
            object: ObjectType.ELECTION,
            action: ActionType.CAST_VOTE,
            election: mockElectionId.valueOf(),
            opened_at: TIMESTAMP,
          } as MessageData,
        }),
      ).toBeFalse();
    });

    it('for attendees should update not election.registeredVotes', () => {
      // stores the keypair of somebody else
      KeyPairStore.store(mockPopToken);

      const getEventById = jest.fn(() => Election.fromState(mockElectionOpened.toState()));
      const updateEvent = jest.fn();

      const castVoteMessage = new CastVote({
        lao: mockLaoIdHash,
        election: mockElectionId,
        created_at: TIMESTAMP,
        votes: [mockVote1, mockVote2],
      });

      expect(
        handleCastVoteMessage(
          mockGetCurrentLao,
          getEventById,
          updateEvent,
        )({
          ...mockMessageData,
          messageData: castVoteMessage,
        }),
      ).toBeTrue();

      // check whether getEventById and updateEvent have been not been
      expect(getEventById).toHaveBeenCalledTimes(0);
      expect(updateEvent).toHaveBeenCalledTimes(0);
    });

    it('for organizers should update election.registeredVotes', () => {
      // stores the keypair of the mockLao organizer
      KeyPairStore.store(mockKeyPair);

      const getEventById = jest.fn(() => Election.fromState(mockElectionOpened.toState()));
      const updateEvent = jest.fn();

      const castVoteMessage = new CastVote({
        lao: mockLaoIdHash,
        election: mockElectionId,
        created_at: TIMESTAMP,
        votes: [mockVote1, mockVote2],
      });

      expect(
        handleCastVoteMessage(
          mockGetCurrentLao,
          getEventById,
          updateEvent,
        )({
          ...mockMessageData,
          messageData: castVoteMessage,
        }),
      ).toBeTrue();

      // check whether getEventById has been called correctly
      expect(getEventById).toHaveBeenCalledWith(mockElectionId);
      expect(getEventById).toHaveBeenCalledTimes(1);

      const newVote: RegisteredVote = {
        createdAt: castVoteMessage.created_at.valueOf(),
        sender: mockMessageData.sender.valueOf(),
        votes: castVoteMessage.votes,
        messageId: mockMessageData.message_id.valueOf(),
      };

      const newRegisteredVotes = [...mockElectionOpened.registeredVotes, newVote];

      // check whether updateEvent has been called correctly
      const updatedElection = Election.fromState(mockElectionOpened.toState());
      updatedElection.registeredVotes = newRegisteredVotes;

      expect(updateEvent).toHaveBeenLastCalledWith(updatedElection);
    });
  });

  describe('election#end', () => {
    it('should return false if the object is not "election"', () => {
      expect(
        handleElectionEndMessage(
          mockGetEventById,
          mockUpdateEvent,
        )({
          ...mockMessageData,
          messageData: {
            object: ObjectType.CHIRP,
            action: ActionType.END,
          },
        }),
      ).toBeFalse();
    });

    it('should return false if the action is not "end"', () => {
      expect(
        handleElectionEndMessage(
          mockGetEventById,
          mockUpdateEvent,
        )({
          ...mockMessageData,
          messageData: {
            object: ObjectType.ELECTION,
            action: ActionType.ADD,
          },
        }),
      ).toBeFalse();
    });

    it('should return false if the message is not received on a lao channel', () => {
      expect(
        handleElectionEndMessage(
          jest.fn(),
          jest.fn(),
        )({
          ...mockMessageData,
          laoId: undefined,
          messageData: new EndElection({
            lao: mockLaoIdHash,
            election: mockElectionId,
            created_at: TIMESTAMP,
            registered_votes: mockRegistedVotesHash,
          }),
        }),
      ).toBeFalse();
    });

    it('should return false if the election has not previously been stored', () => {
      expect(
        handleElectionEndMessage(
          mockGetEventById,
          mockUpdateEvent,
        )({
          ...mockMessageData,
          messageData: {
            object: ObjectType.ELECTION,
            action: ActionType.END,
            election: mockElectionId.valueOf(),
            created_at: TIMESTAMP,
          } as MessageData,
        }),
      ).toBeFalse();
    });

    it('should update the election status', () => {
      const getEventById = jest.fn(() => Election.fromState(mockElectionOpened.toState()));
      const updateEvent = jest.fn();

      expect(
        handleElectionEndMessage(
          getEventById,
          updateEvent,
        )({
          ...mockMessageData,
          messageData: new EndElection({
            lao: mockLaoIdHash,
            election: mockElectionId,
            created_at: TIMESTAMP,
            registered_votes: mockRegistedVotesHash,
          }),
        }),
      ).toBeTrue();

      // check whether getEventById has been called correctly
      expect(getEventById).toHaveBeenCalledWith(mockElectionId);
      expect(getEventById).toHaveBeenCalledTimes(1);

      // check whether updateEvent has been called correctly
      const updatedElection = Election.fromState(mockElectionOpened.toState());
      updatedElection.electionStatus = ElectionStatus.TERMINATED;

      expect(updateEvent).toHaveBeenCalledWith(updatedElection);
      expect(updateEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('election#result', () => {
    it('should return false if the object is not "election"', () => {
      expect(
        handleElectionResultMessage(
          mockGetEventById,
          mockUpdateEvent,
        )({
          ...mockMessageData,
          messageData: {
            object: ObjectType.CHIRP,
            action: ActionType.RESULT,
          },
        }),
      ).toBeFalse();
    });

    it('should return false if the action is not "result"', () => {
      expect(
        handleElectionResultMessage(
          mockGetEventById,
          mockUpdateEvent,
        )({
          ...mockMessageData,
          messageData: {
            object: ObjectType.ELECTION,
            action: ActionType.ADD,
          },
        }),
      ).toBeFalse();
    });

    it('should return false if the message data does not contain a channel', () => {
      expect(
        handleElectionResultMessage(
          mockGetEventById,
          mockUpdateEvent,
        )({
          ...mockMessageData,
          channel: '',
          messageData: {
            object: ObjectType.ELECTION,
            action: ActionType.RESULT,
          },
        }),
      ).toBeFalse();
    });

    it('should return false if the election has not previously been stored', () => {
      expect(
        handleElectionResultMessage(
          mockGetEventById,
          mockUpdateEvent,
        )({
          ...mockMessageData,
          messageData: {
            object: ObjectType.ELECTION,
            action: ActionType.RESULT,
            election: mockElectionId.valueOf(),
            created_at: TIMESTAMP,
          } as MessageData,
        }),
      ).toBeFalse();
    });

    it('should update the election status and store results', () => {
      const getEventById = jest.fn(() => Election.fromState(mockElectionTerminated.toState()));
      const updateEvent = jest.fn();

      expect(
        handleElectionResultMessage(
          getEventById,
          updateEvent,
        )({
          ...mockMessageData,
          messageData: new ElectionResult({
            questions: mockElectionResultQuestions,
          }),
        }),
      ).toBeTrue();

      // check whether getEventById has been called correctly
      expect(getEventById).toHaveBeenCalledWith(getLastPartOfChannel(mockMessageData.channel));
      expect(getEventById).toHaveBeenCalledTimes(1);

      // check whether updateEvent has been called correctly
      const updatedElection = Election.fromState(mockElectionTerminated.toState());
      updatedElection.electionStatus = ElectionStatus.RESULT;
      updatedElection.questionResult = mockElectionResultQuestions.map((q) => ({
        id: q.id,
        result: q.result.map((r) => ({ ballotOption: r.ballot_option, count: r.count })),
      }));

      expect(updateEvent).toHaveBeenCalledWith(updatedElection);
    });
  });
});
