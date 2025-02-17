import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react-native';
import React from 'react';
import { Provider } from 'react-redux';
import { combineReducers } from 'redux';

import MockNavigator from '__tests__/components/MockNavigator';
import { mockLaoId } from '__tests__/utils';
import FeatureContext from 'core/contexts/FeatureContext';
import {
  NOTIFICATION_FEATURE_IDENTIFIER,
  NotificationReactContext,
} from 'features/notification/interface/Configuration';
import { NotificationState } from 'features/notification/objects/Notification';
import {
  addNotification,
  markNotificationAsRead,
  notificationReducer,
} from 'features/notification/reducer';
import { WitnessNotificationType } from 'features/witness/components';
import { WitnessFeature } from 'features/witness/interface';
import { MessageToWitnessNotificationState } from 'features/witness/objects/MessageToWitnessNotification';

import NotificationScreen, { NotificationScreenRightHeader } from '../NotificationScreen';

const contextValue = {
  [NOTIFICATION_FEATURE_IDENTIFIER]: {
    useCurrentLaoId: () => mockLaoId,
    notificationTypes: [WitnessNotificationType],
  } as NotificationReactContext,
};

// set up mock store
const mockStore = configureStore({ reducer: combineReducers({ ...notificationReducer }) });
mockStore.dispatch(
  addNotification({
    laoId: mockLaoId.toState(),
    title: 'a notification',
    timestamp: 0,
    type: WitnessFeature.NotificationTypes.MESSAGE_TO_WITNESS,
    messageId: 'x',
  } as MessageToWitnessNotificationState as NotificationState),
);
mockStore.dispatch(
  addNotification({
    laoId: mockLaoId.toState(),
    title: 'another notification',
    timestamp: 1,
    type: WitnessFeature.NotificationTypes.MESSAGE_TO_WITNESS,
    messageId: 'x',
  } as MessageToWitnessNotificationState as NotificationState),
);
mockStore.dispatch(
  markNotificationAsRead({
    laoId: mockLaoId,
    notificationId: 0,
  }),
);

describe('NotificationScreen', () => {
  it('renders correctly', () => {
    const component = render(
      <Provider store={mockStore}>
        <FeatureContext.Provider value={contextValue}>
          <MockNavigator component={NotificationScreen} />
        </FeatureContext.Provider>
      </Provider>,
    ).toJSON();
    expect(component).toMatchSnapshot();
  });
});

describe('NotificationScreenRightHeader', () => {
  it('renders correctly', () => {
    const component = render(
      <Provider store={mockStore}>
        <FeatureContext.Provider value={contextValue}>
          <MockNavigator component={NotificationScreenRightHeader} />
        </FeatureContext.Provider>
      </Provider>,
    ).toJSON();
    expect(component).toMatchSnapshot();
  });
});
