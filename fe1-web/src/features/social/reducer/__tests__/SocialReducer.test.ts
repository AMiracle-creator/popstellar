import 'jest-extended';

import { describe } from '@jest/globals';
import { AnyAction } from 'redux';

import { serializedMockLaoId, mockLaoId } from '__tests__/utils/TestUtils';
import {
  mockChirp0,
  mockChirp0DeletedFake,
  mockChirp1,
  mockChirp1Deleted,
  mockChirp1DeletedFake,
  mockChirp2,
  mockChirp3,
  mockChirp4,
  mockChirp4Deleted,
  mockChirpId0,
  mockChirpId1,
  mockChirpId2,
  mockReaction1,
  mockReaction2,
  mockReaction3,
  mockReaction4,
  mockSender1,
  mockSender2,
} from 'features/social/__tests__/utils';

import {
  addChirp,
  addReaction,
  deleteChirp,
  makeChirpsList,
  makeChirpsListOfUser,
  makeReactionsList,
  SocialLaoReducerState,
  socialReduce,
} from '../SocialReducer';

// region test data

const emptyState: SocialLaoReducerState = {
  byLaoId: {
    myLaoId: {
      allIdsInOrder: [],
      byId: {},
      byUser: {},
      reactionsByChirp: {},
    },
  },
};

const chirpFilledState0Deleted: SocialLaoReducerState = {
  byLaoId: {
    myLaoId: {
      allIdsInOrder: [],
      byId: {},
      byUser: {},
      reactionsByChirp: {},
    },
    [serializedMockLaoId]: {
      allIdsInOrder: [],
      byId: { [mockChirpId0.toState()]: mockChirp0DeletedFake.toState() },
      byUser: {},
      reactionsByChirp: {},
    },
  },
};

const chirpFilledState0Added: SocialLaoReducerState = {
  byLaoId: {
    myLaoId: {
      allIdsInOrder: [],
      byId: {},
      byUser: {},
      reactionsByChirp: {},
    },
    [serializedMockLaoId]: {
      allIdsInOrder: [mockChirp0.id.toState()],
      byId: { [mockChirp0.id.toState()]: mockChirp0.toState() },
      byUser: { [mockChirp0.sender.toState()]: [mockChirp0.id.toState()] },
      reactionsByChirp: {},
    },
  },
};

const chirpFilledState1: SocialLaoReducerState = {
  byLaoId: {
    myLaoId: {
      allIdsInOrder: [],
      byId: {},
      byUser: {},
      reactionsByChirp: {},
    },
    [serializedMockLaoId]: {
      allIdsInOrder: [mockChirp1.id.toState()],
      byId: { [mockChirp1.id.toState()]: mockChirp1.toState() },
      byUser: { [mockChirp1.sender.toState()]: [mockChirp1.id.toState()] },
      reactionsByChirp: {},
    },
  },
};

const chirpFilledState2: SocialLaoReducerState = {
  byLaoId: {
    myLaoId: {
      allIdsInOrder: [],
      byId: {},
      byUser: {},
      reactionsByChirp: {},
    },
    [serializedMockLaoId]: {
      allIdsInOrder: [mockChirp2.id.toState(), mockChirp1.id.toState()],
      byId: {
        [mockChirp1.id.toState()]: mockChirp1.toState(),
        [mockChirp2.id.toState()]: mockChirp2.toState(),
      },
      byUser: {
        [mockChirp1.sender.toState()]: [mockChirp1.id.toState()],
        [mockChirp2.sender.toState()]: [mockChirp2.id.toState()],
      },
      reactionsByChirp: {},
    },
  },
};

const chirpFilledState3: SocialLaoReducerState = {
  byLaoId: {
    myLaoId: {
      allIdsInOrder: [],
      byId: {},
      byUser: {},
      reactionsByChirp: {},
    },
    [serializedMockLaoId]: {
      allIdsInOrder: [mockChirp2.id.toState(), mockChirp3.id.toState(), mockChirp1.id.toState()],
      byId: {
        [mockChirp1.id.toState()]: mockChirp1.toState(),
        [mockChirp2.id.toState()]: mockChirp2.toState(),
        [mockChirp3.id.toState()]: mockChirp3.toState(),
      },
      byUser: {
        [mockChirp1.sender.toState()]: [mockChirp3.id.toState(), mockChirp1.id.toState()],
        [mockChirp2.sender.toState()]: [mockChirp2.id.toState()],
      },
      reactionsByChirp: {},
    },
  },
};

const chirpFilledState4: SocialLaoReducerState = {
  byLaoId: {
    myLaoId: {
      allIdsInOrder: [],
      byId: {},
      byUser: {},
      reactionsByChirp: {},
    },
    [serializedMockLaoId]: {
      allIdsInOrder: [
        mockChirp4.id.toState(),
        mockChirp2.id.toState(),
        mockChirp3.id.toState(),
        mockChirp1.id.toState(),
      ],
      byId: {
        [mockChirp1.id.toState()]: mockChirp1.toState(),
        [mockChirp2.id.toState()]: mockChirp2.toState(),
        [mockChirp3.id.toState()]: mockChirp3.toState(),
        [mockChirp4.id.toState()]: mockChirp4.toState(),
      },
      byUser: {
        [mockChirp1.sender.toState()]: [
          mockChirp4.id.toState(),
          mockChirp3.id.toState(),
          mockChirp1.id.toState(),
        ],
        [mockChirp2.sender.toState()]: [mockChirp2.id.toState()],
      },
      reactionsByChirp: {},
    },
  },
};

const chirpFilledState4Chirp1Deleted: SocialLaoReducerState = {
  byLaoId: {
    myLaoId: {
      allIdsInOrder: [],
      byId: {},
      byUser: {},
      reactionsByChirp: {},
    },
    [serializedMockLaoId]: {
      allIdsInOrder: [
        mockChirp4.id.toState(),
        mockChirp2.id.toState(),
        mockChirp3.id.toState(),
        mockChirp1.id.toState(),
      ],
      byId: {
        [mockChirp1.id.toState()]: mockChirp1Deleted.toState(),
        [mockChirp2.id.toState()]: mockChirp2.toState(),
        [mockChirp3.id.toState()]: mockChirp3.toState(),
        [mockChirp4.id.toState()]: mockChirp4.toState(),
      },
      byUser: {
        [mockChirp1.sender.toState()]: [
          mockChirp4.id.toState(),
          mockChirp3.id.toState(),
          mockChirp1.id.toState(),
        ],
        [mockChirp2.sender.toState()]: [mockChirp2.id.toState()],
      },
      reactionsByChirp: {},
    },
  },
};

const chirpFilledState4Chirp4Deleted: SocialLaoReducerState = {
  byLaoId: {
    myLaoId: {
      allIdsInOrder: [],
      byId: {},
      byUser: {},
      reactionsByChirp: {},
    },
    [serializedMockLaoId]: {
      allIdsInOrder: [
        mockChirp4.id.toState(),
        mockChirp2.id.toState(),
        mockChirp3.id.toState(),
        mockChirp1.id.toState(),
      ],
      byId: {
        [mockChirp1.id.toState()]: mockChirp1.toState(),
        [mockChirp2.id.toState()]: mockChirp2.toState(),
        [mockChirp3.id.toState()]: mockChirp3.toState(),
        [mockChirp4.id.toState()]: mockChirp4Deleted.toState(),
      },
      byUser: {
        [mockChirp1.sender.toState()]: [
          mockChirp4.id.toState(),
          mockChirp3.id.toState(),
          mockChirp1.id.toState(),
        ],
        [mockChirp2.sender.toState()]: [mockChirp2.id.toState()],
      },
      reactionsByChirp: {},
    },
  },
};

const reactionFilledState1: SocialLaoReducerState = {
  byLaoId: {
    myLaoId: {
      allIdsInOrder: [],
      byId: {},
      byUser: {},
      reactionsByChirp: {},
    },
    [serializedMockLaoId]: {
      allIdsInOrder: [],
      byId: {},
      byUser: {},
      reactionsByChirp: { [mockChirpId1.toString()]: { '👍': [mockSender1.toString()] } },
    },
  },
};

const reactionFilledState11: SocialLaoReducerState = {
  byLaoId: {
    myLaoId: {
      allIdsInOrder: [],
      byId: {},
      byUser: {},
      reactionsByChirp: {},
    },
    [serializedMockLaoId]: {
      allIdsInOrder: [mockChirp1.id.toState()],
      byId: { [mockChirp1.id.toState()]: mockChirp1.toState() },
      byUser: { [mockChirp1.sender.toState()]: [mockChirp1.id.toState()] },
      reactionsByChirp: { [mockChirpId1.toState()]: { '👍': [mockSender1.toState()] } },
    },
  },
};

const reactionFilledState2: SocialLaoReducerState = {
  byLaoId: {
    myLaoId: {
      allIdsInOrder: [],
      byId: {},
      byUser: {},
      reactionsByChirp: {},
    },
    [serializedMockLaoId]: {
      allIdsInOrder: [],
      byId: {},
      byUser: {},
      reactionsByChirp: {
        [mockChirpId1.toState()]: {
          '👍': [mockSender1.toState()],
          '❤️': [mockSender1.toState()],
        },
      },
    },
  },
};

const reactionFilledState22: SocialLaoReducerState = {
  byLaoId: {
    myLaoId: {
      allIdsInOrder: [],
      byId: {},
      byUser: {},
      reactionsByChirp: {},
    },
    [serializedMockLaoId]: {
      allIdsInOrder: [mockChirp1.id.toState()],
      byId: { [mockChirp1.id.toState()]: mockChirp1.toState() },
      byUser: { [mockChirp1.sender.toState()]: [mockChirp1.id.toState()] },
      reactionsByChirp: {
        [mockChirpId1.toState()]: {
          '👍': [mockSender1.toState()],
          '❤️': [mockSender1.toState()],
        },
      },
    },
  },
};

const reactionFilledState3: SocialLaoReducerState = {
  byLaoId: {
    myLaoId: {
      allIdsInOrder: [],
      byId: {},
      byUser: {},
      reactionsByChirp: {},
    },
    [serializedMockLaoId]: {
      allIdsInOrder: [],
      byId: {},
      byUser: {},
      reactionsByChirp: {
        [mockChirpId1.toState()]: {
          '👍': [mockSender1.toState(), mockSender2.toState()],
          '❤️': [mockSender1.toState()],
        },
      },
    },
  },
};

const reactionFilledState33: SocialLaoReducerState = {
  byLaoId: {
    myLaoId: {
      allIdsInOrder: [],
      byId: {},
      byUser: {},
      reactionsByChirp: {},
    },
    [serializedMockLaoId]: {
      allIdsInOrder: [mockChirp1.id.toState()],
      byId: { [mockChirp1.id.toState()]: mockChirp1.toState() },
      byUser: { [mockChirp1.sender.toState()]: [mockChirp1.id.toState()] },
      reactionsByChirp: {
        [mockChirpId1.toState()]: {
          '👍': [mockSender1.toState(), mockSender2.toState()],
          '❤️': [mockSender1.toState()],
        },
      },
    },
  },
};

const reactionFilledState4: SocialLaoReducerState = {
  byLaoId: {
    myLaoId: {
      allIdsInOrder: [],
      byId: {},
      byUser: {},
      reactionsByChirp: {},
    },
    [serializedMockLaoId]: {
      allIdsInOrder: [],
      byId: {},
      byUser: {},
      reactionsByChirp: {
        [mockChirpId1.toState()]: { '👍': [mockSender1.toState()] },
        [mockChirpId2.toState()]: { '👍': [mockSender2.toState()] },
      },
    },
  },
};

const reactionFilledState44: SocialLaoReducerState = {
  byLaoId: {
    myLaoId: {
      allIdsInOrder: [],
      byId: {},
      byUser: {},
      reactionsByChirp: {},
    },
    [serializedMockLaoId]: {
      allIdsInOrder: [mockChirp2.id.toState(), mockChirp1.id.toState()],
      byId: {
        [mockChirp1.id.toState()]: mockChirp1.toState(),
        [mockChirp2.id.toState()]: mockChirp2.toState(),
      },
      byUser: {
        [mockChirp1.sender.toState()]: [mockChirp1.id.toState()],
        [mockChirp2.sender.toState()]: [mockChirp2.id.toState()],
      },
      reactionsByChirp: {
        [mockChirpId1.toState()]: { '👍': [mockSender1.toState()] },
        [mockChirpId2.toState()]: { '👍': [mockSender2.toState()] },
      },
    },
  },
};
// endregion

describe('SocialReducer', () => {
  describe('chirp reducer', () => {
    it('should return the initial state', () => {
      expect(socialReduce(undefined, {} as AnyAction)).toEqual(emptyState);
    });

    it('should add the first chirp correctly', () => {
      expect(socialReduce(emptyState, addChirp(mockLaoId, mockChirp1))).toEqual(chirpFilledState1);
    });

    it('should add the newer chirp before the first chirp', () => {
      expect(socialReduce(chirpFilledState1, addChirp(mockLaoId, mockChirp2))).toEqual(
        chirpFilledState2,
      );
    });

    it('should add the newer chirp after the second chirp', () => {
      expect(socialReduce(chirpFilledState2, addChirp(mockLaoId, mockChirp3))).toEqual(
        chirpFilledState3,
      );
    });

    it('should add the newest chirp on top', () => {
      expect(socialReduce(chirpFilledState3, addChirp(mockLaoId, mockChirp4))).toEqual(
        chirpFilledState4,
      );
    });

    it('should mark chirp 1 as deleted', () => {
      expect(socialReduce(chirpFilledState4, deleteChirp(mockLaoId, mockChirp1Deleted))).toEqual(
        chirpFilledState4Chirp1Deleted,
      );
    });

    it('delete a non-stored chirp should store it in byId as deleted', () => {
      expect(socialReduce(emptyState, deleteChirp(mockLaoId, mockChirp0DeletedFake))).toEqual(
        chirpFilledState0Deleted,
      );
    });

    it('should ignore delete request sent by non-original sender', () => {
      expect(
        socialReduce(chirpFilledState4, deleteChirp(mockLaoId, mockChirp1DeletedFake)),
      ).toEqual(chirpFilledState4);
    });

    it('should update/add a chirp if it has been deleted by a different sender', () => {
      expect(socialReduce(chirpFilledState0Deleted, addChirp(mockLaoId, mockChirp0))).toEqual(
        chirpFilledState0Added,
      );
    });

    it('should not re-add a chirp if it has already been deleted by the same sender', () => {
      const stateDeleted = socialReduce(chirpFilledState3, deleteChirp(mockLaoId, mockChirp4));
      expect(socialReduce(stateDeleted, addChirp(mockLaoId, mockChirp4))).toEqual(
        chirpFilledState4Chirp4Deleted,
      );
    });
  });

  describe('chirp selector', () => {
    it('should return an empty list of chirpState when no lao is opened', () => {
      expect(makeChirpsList(mockLaoId).resultFunc(emptyState)).toEqual([]);
    });

    it('should return an empty list', () => {
      expect(makeChirpsList(mockLaoId).resultFunc(emptyState)).toEqual([]);
    });

    it('should return the first chirp state', () => {
      expect(makeChirpsList(mockLaoId).resultFunc(chirpFilledState1)).toEqual([mockChirp1]);
    });

    it('should return the newer chirp before the first chirp', () => {
      expect(makeChirpsList(mockLaoId).resultFunc(chirpFilledState2)).toEqual([
        mockChirp2,
        mockChirp1,
      ]);
    });

    it('should add the newer chirp after the second chirp', () => {
      expect(makeChirpsList(mockLaoId).resultFunc(chirpFilledState3)).toEqual([
        mockChirp2,
        mockChirp3,
        mockChirp1,
      ]);
    });

    it('should return the newest chirp on top', () => {
      expect(makeChirpsList(mockLaoId).resultFunc(chirpFilledState4)).toEqual([
        mockChirp4,
        mockChirp2,
        mockChirp3,
        mockChirp1,
      ]);
    });

    it('should return the correct chirps list for an active user', () => {
      expect(
        makeChirpsListOfUser(mockLaoId)(mockChirp1.sender).resultFunc(chirpFilledState3),
      ).toEqual([mockChirp3, mockChirp1]);
    });

    it('should return an empty list for an inactive user', () => {
      expect(
        makeChirpsListOfUser(mockLaoId)(mockChirp2.sender).resultFunc(chirpFilledState1),
      ).toEqual([]);
    });

    it('should return an empty list for an undefined lao', () => {
      expect(
        makeChirpsListOfUser(mockLaoId)(mockChirp2.sender).resultFunc(chirpFilledState1),
      ).toEqual([]);
    });
  });

  describe('reaction reducer', () => {
    it('should create entry for a chirp when receiving the first reaction on it', () => {
      expect(socialReduce(emptyState, addReaction(mockLaoId, mockReaction1))).toEqual(
        reactionFilledState1,
      );
    });

    it('should add reaction codepoint to an existing chirp', () => {
      expect(socialReduce(reactionFilledState1, addReaction(mockLaoId, mockReaction2))).toEqual(
        reactionFilledState2,
      );
    });

    it('should add new reaction sender for a chirp', () => {
      expect(socialReduce(reactionFilledState2, addReaction(mockLaoId, mockReaction3))).toEqual(
        reactionFilledState3,
      );
    });

    it('should not add existing sender of a reaction for a chirp', () => {
      expect(socialReduce(reactionFilledState3, addReaction(mockLaoId, mockReaction1))).toEqual(
        reactionFilledState3,
      );
    });

    it('should create new chirp entry correctly', () => {
      expect(socialReduce(reactionFilledState1, addReaction(mockLaoId, mockReaction4))).toEqual(
        reactionFilledState4,
      );
    });
  });

  describe('reaction selector', () => {
    it('should return an empty record of reactionState when no lao is opened', () => {
      expect(makeReactionsList(mockLaoId).resultFunc(emptyState)).toEqual({});
    });

    it('should return an empty record', () => {
      expect(makeReactionsList(mockLaoId).resultFunc(emptyState)).toEqual({});
    });

    it('should return an empty record for non-stored chirp', () => {
      expect(makeReactionsList(mockLaoId).resultFunc(reactionFilledState1)).toEqual({});
    });

    it('should return the first reaction state', () => {
      expect(makeReactionsList(mockLaoId).resultFunc(reactionFilledState11)).toEqual({
        [mockChirpId1.toString()]: {
          '👍': [mockSender1],
          '👎': [],
          '❤️': [],
        },
      });
    });

    it('should add reaction count correctly', () => {
      expect(makeReactionsList(mockLaoId).resultFunc(reactionFilledState22)).toEqual({
        [mockChirpId1.toString()]: {
          '👍': [mockSender1],
          '👎': [],
          '❤️': [mockSender1],
        },
      });
    });

    it('should increment counter for new sender', () => {
      expect(makeReactionsList(mockLaoId).resultFunc(reactionFilledState33)).toEqual({
        [mockChirpId1.toString()]: {
          '👍': [mockSender1, mockSender2],
          '👎': [],
          '❤️': [mockSender1],
        },
      });
    });

    it('should return state of two reaction', () => {
      expect(makeReactionsList(mockLaoId).resultFunc(reactionFilledState44)).toEqual({
        [mockChirpId1.toString()]: {
          '👍': [mockSender1],
          '👎': [],
          '❤️': [],
        },
        [mockChirpId2.toString()]: {
          '👍': [mockSender2],
          '👎': [],
          '❤️': [],
        },
      });
    });
  });
});
