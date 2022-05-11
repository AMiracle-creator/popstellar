import 'jest-extended';
import '__tests__/utils/matchers';
import { mockAddress, mockPopToken } from '__tests__/utils';
import {
  ActionType,
  MessageData,
  ObjectType,
  ProcessableMessage,
} from 'core/network/jsonrpc/messages';
import { Base64UrlData, Hash, Signature, Timestamp } from 'core/objects';
import { EventTypeRollCall, RollCall, RollCallStatus } from 'features/rollCall/objects';

import {
  handleRollCallCloseMessage,
  handleRollCallCreateMessage,
  handleRollCallOpenMessage,
  handleRollCallReopenMessage,
} from '../RollCallHandler';

jest.mock('core/network/JsonRpcApi');
jest.mock('core/redux');
jest.mock('features/events/network/EventHandlerUtils');
jest.mock('features/lao/reducer');

// region Mock Values Initialization region
const ID = new Hash('rollCallId');
const NAME = 'myRollCall';
const LOCATION = 'location';
const TIMESTAMP_START = new Timestamp(1620255600);
const TIMESTAMP_END = new Timestamp(1620357600);
const ATTENDEES = ['attendee1', 'attendee2'];
const rollCallStateCreated: any = {
  id: ID.valueOf(),
  eventType: EventTypeRollCall,
  start: TIMESTAMP_START.valueOf(),
  name: NAME,
  location: LOCATION,
  creation: TIMESTAMP_START.valueOf(),
  proposedStart: TIMESTAMP_START.valueOf(),
  proposedEnd: TIMESTAMP_END.valueOf(),
  status: RollCallStatus.CREATED,
};
const rollCallStateOpened = {
  ...rollCallStateCreated,
  idAlias: ID.valueOf(),
  openedAt: TIMESTAMP_START.valueOf(),
  status: RollCallStatus.OPENED,
};
const rollCallStateClosed = {
  ...rollCallStateOpened,
  closedAt: TIMESTAMP_END.valueOf(),
  status: RollCallStatus.CLOSED,
  attendees: ATTENDEES,
};
const rollCallStateReopened = {
  ...rollCallStateClosed,
  status: RollCallStatus.REOPENED,
};

const mockRollCallClosed = RollCall.fromState(rollCallStateClosed);
const mockRollCallCreated = RollCall.fromState(rollCallStateCreated);
const mockRollCallOpened = RollCall.fromState(rollCallStateOpened);
const mockRollCallReopened = RollCall.fromState(rollCallStateReopened);

const createMockMsg = (type: ActionType, rollCallState: any): ProcessableMessage => {
  return {
    laoId: ID,
    receivedAt: TIMESTAMP_START,
    receivedFrom: mockAddress,
    channel: 'undefined',
    data: Base64UrlData.encode(''),
    sender: ID,
    signature: new Signature(''),
    message_id: ID,
    witness_signatures: [],
    messageData: {
      object: ObjectType.ROLL_CALL,
      action: type,
      ...rollCallState,
      proposed_start: rollCallState.proposedStart,
      proposed_end: rollCallState.proposedEnd,
      opened_at: rollCallState?.openedAt,
      update_id: rollCallState?.idAlias,
      closed_at: rollCallState?.closedAt,
    },
  };
};
// endregion

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RollCallHandler', () => {
  describe('handleRollCallCreateMessage', () => {
    it('should return false for wrong object types', () => {
      expect(
        handleRollCallCreateMessage(jest.fn())(
          createMockMsg(ActionType.CREATE, {
            ...rollCallStateCreated,
            object: ObjectType.CHIRP,
          } as MessageData),
        ),
      ).toBeFalse();
    });

    it('should return false for wrong action types', () => {
      expect(
        handleRollCallCreateMessage(jest.fn())(createMockMsg(ActionType.ADD, rollCallStateCreated)),
      ).toBeFalse();
    });

    it('should create a correct RollCall object from msgData', async () => {
      const usedMockMsg = createMockMsg(ActionType.CREATE, rollCallStateCreated);

      const mockAddEvent = jest.fn();

      expect(handleRollCallCreateMessage(mockAddEvent)(usedMockMsg)).toBeTrue();

      expect(mockAddEvent).toHaveBeenCalledWith(usedMockMsg.laoId, mockRollCallCreated.toState());
    });
  });

  describe('handleRollCallOpenMessage', () => {
    it('should return false for wrong object types', () => {
      expect(
        handleRollCallOpenMessage(
          jest.fn(),
          jest.fn(),
        )(
          createMockMsg(ActionType.CREATE, {
            ...rollCallStateOpened,
            object: ObjectType.CHIRP,
          } as MessageData),
        ),
      ).toBeFalse();
    });

    it('should return false for wrong action types', () => {
      expect(
        handleRollCallOpenMessage(
          jest.fn(),
          jest.fn(),
        )(createMockMsg(ActionType.ADD, rollCallStateOpened)),
      ).toBeFalse();
    });

    it('should return false for unkown roll call ids', () => {
      expect(
        handleRollCallOpenMessage(
          jest.fn(() => undefined),
          jest.fn(),
        )(createMockMsg(ActionType.OPEN, rollCallStateOpened)),
      ).toBeFalse();
    });

    it('should create a correct RollCall object from msgData', async () => {
      const usedMockMsg = createMockMsg(ActionType.OPEN, rollCallStateOpened);

      const mockGetEventById = jest.fn(() => mockRollCallCreated);
      const mockUpdateEvent = jest.fn();

      expect(handleRollCallOpenMessage(mockGetEventById, mockUpdateEvent)(usedMockMsg)).toBeTrue();

      expect(mockUpdateEvent).toHaveBeenCalledWith(usedMockMsg.laoId, mockRollCallOpened.toState());
    });
  });

  describe('handleRollCallCloseMessage', () => {
    it('should return false for wrong object types', () => {
      expect(
        handleRollCallCloseMessage(
          jest.fn(),
          jest.fn(),
          jest.fn(),
          jest.fn(),
        )(
          createMockMsg(ActionType.CREATE, {
            ...rollCallStateClosed,
            object: ObjectType.CHIRP,
          } as MessageData),
        ),
      ).toBeFalse();
    });

    it('should return false for wrong action types', () => {
      expect(
        handleRollCallCloseMessage(
          jest.fn(),
          jest.fn(),
          jest.fn(),
          jest.fn(),
        )(createMockMsg(ActionType.ADD, rollCallStateClosed)),
      ).toBeFalse();
    });

    it('should return false for unkown roll call ids', () => {
      expect(
        handleRollCallCloseMessage(
          jest.fn(() => undefined),
          jest.fn(),
          jest.fn(),
          jest.fn(),
        )(createMockMsg(ActionType.CLOSE, rollCallStateOpened)),
      ).toBeFalse();
    });

    it('should create a correct RollCall object from msgData in handleRollCallCloseMessage', async () => {
      const usedMockMsg = createMockMsg(ActionType.CLOSE, rollCallStateClosed);

      const mockGetEventById = jest.fn(() => mockRollCallOpened);
      const mockUpdateEvent = jest.fn();
      const mockGenerateToken = jest.fn(() => Promise.resolve(mockPopToken));
      const mockSetLaoLastRollCall = jest.fn();

      expect(
        handleRollCallCloseMessage(
          mockGetEventById,
          mockUpdateEvent,
          mockGenerateToken,
          mockSetLaoLastRollCall,
        )(usedMockMsg),
      ).toBeTrue();

      expect(mockUpdateEvent).toHaveBeenCalledWith(usedMockMsg.laoId, mockRollCallClosed.toState());
    });
  });

  describe('handleRollCallReopenMessage', () => {
    it('should return false for wrong object types', () => {
      expect(
        handleRollCallReopenMessage(
          jest.fn(),
          jest.fn(),
        )(
          createMockMsg(ActionType.CREATE, {
            ...rollCallStateClosed,
            object: ObjectType.CHIRP,
          } as MessageData),
        ),
      ).toBeFalse();
    });

    it('should return false for wrong action types', () => {
      expect(
        handleRollCallReopenMessage(
          jest.fn(),
          jest.fn(),
        )(createMockMsg(ActionType.ADD, rollCallStateClosed)),
      ).toBeFalse();
    });

    it('should return false for unkown roll call ids', () => {
      expect(
        handleRollCallReopenMessage(
          jest.fn(() => undefined),
          jest.fn(),
        )(createMockMsg(ActionType.REOPEN, rollCallStateOpened)),
      ).toBeFalse();
    });

    it('should return false if the given roll call is not closed', () => {
      expect(
        handleRollCallReopenMessage(
          jest.fn(() => mockRollCallOpened),
          jest.fn(),
        )(createMockMsg(ActionType.REOPEN, rollCallStateOpened)),
      ).toBeFalse();
    });

    it('should create a correct RollCall object from msgData', async () => {
      const usedMockMsg = createMockMsg(ActionType.REOPEN, rollCallStateReopened);

      const mockGetEventById = jest.fn(() => mockRollCallClosed);
      const mockUpdateEvent = jest.fn();

      expect(
        handleRollCallReopenMessage(mockGetEventById, mockUpdateEvent)(usedMockMsg),
      ).toBeTrue();

      expect(mockUpdateEvent).toHaveBeenCalledWith(
        usedMockMsg.laoId,
        mockRollCallReopened.toState(),
      );
    });
  });
});
