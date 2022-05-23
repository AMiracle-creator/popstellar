import { render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { Provider } from 'react-redux';
import { combineReducers, createStore } from 'redux';

import MockNavigator from '__tests__/components/MockNavigator';
import { mockKeyPair, mockLao } from '__tests__/utils';
import FeatureContext from 'core/contexts/FeatureContext';
import { keyPairReducer, setKeyPair } from 'core/keypair';
import { encodeLaoConnectionForQRCode } from 'features/home/functions';
import { LaoFeature, LaoReactContext, LAO_FEATURE_IDENTIFIER } from 'features/lao/interface';
import { connectToLao, laoReducer } from 'features/lao/reducer';

import OrganizerEventsNavigation from '../OrganizerEventsNavigation';

const contextValue = {
  [LAO_FEATURE_IDENTIFIER]: {
    EventList: () => null,
    encodeLaoConnectionForQRCode,
    laoNavigationScreens: [],
    eventsNavigationScreens: [
      {
        id: 'screen1' as LaoFeature.OrganizerScreen['id'],
        title: 'a title',
        order: 2,
        Component: () => <Text>first screen</Text>,
      },
      {
        id: 'screen2' as LaoFeature.OrganizerScreen['id'],
        order: -2,
        Component: () => <Text>second screen</Text>,
      },
    ],
  } as LaoReactContext,
};

// set up mock store
const mockStore = createStore(combineReducers({ ...laoReducer, ...keyPairReducer }));
mockStore.dispatch(connectToLao(mockLao.toState()));
mockStore.dispatch(setKeyPair(mockKeyPair.toState()));

describe('OrganizerNavigation', () => {
  it('renders correctly', () => {
    const component = render(
      <Provider store={mockStore}>
        <FeatureContext.Provider value={contextValue}>
          <MockNavigator component={OrganizerEventsNavigation} />
        </FeatureContext.Provider>
      </Provider>,
    ).toJSON();
    expect(component).toMatchSnapshot();
  });
});
