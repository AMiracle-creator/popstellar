import { render } from '@testing-library/react-native';
import React from 'react';
import { Provider } from 'react-redux';
import { combineReducers, createStore } from 'redux';

import { mockLaoId, mockLaoIdHash } from '__tests__/utils';
import FeatureContext from 'core/contexts/FeatureContext';
import EventReducer, { addEvent } from 'features/events/reducer/EventReducer';
import { mockMeeting } from 'features/meeting/__tests__/utils';
import { MeetingReactContext, MEETING_FEATURE_IDENTIFIER } from 'features/meeting/interface';
import { addMeeting, meetingReducer } from 'features/meeting/reducer';

import { Meeting } from '../../objects/Meeting';
import EventMeeting from '../EventMeeting';

beforeAll(() => {
  jest.useFakeTimers('modern');
  jest.setSystemTime(new Date(1620255600000)); // 5 May 2021
});

const mockStore = createStore(combineReducers({ ...EventReducer, ...meetingReducer }));
mockStore.dispatch(
  addEvent(mockLaoId, {
    eventType: Meeting.EVENT_TYPE,
    id: mockMeeting.id.valueOf(),
    start: mockMeeting.start.valueOf(),
    end: mockMeeting.end?.valueOf(),
  }),
);
mockStore.dispatch(addMeeting(mockMeeting.toState()));

const contextValue = {
  [MEETING_FEATURE_IDENTIFIER]: {
    useCurrentLaoId: () => mockLaoIdHash,
  } as MeetingReactContext,
};

describe('EventMeeting', () => {
  it('renders correctly', () => {
    const component = render(
      <Provider store={mockStore}>
        <FeatureContext.Provider value={contextValue}>
          <EventMeeting
            eventId={mockMeeting.id.valueOf()}
            start={mockMeeting.start.valueOf()}
            end={mockMeeting.end?.valueOf()}
          />
        </FeatureContext.Provider>
      </Provider>,
    ).toJSON();
    expect(component).toMatchSnapshot();
  });
});
