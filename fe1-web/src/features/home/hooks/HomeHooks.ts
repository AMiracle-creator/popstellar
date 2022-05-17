import { useNavigation } from '@react-navigation/core';
import { useContext, useEffect, useState } from 'react';

import FeatureContext from 'core/contexts/FeatureContext';

import { HomeReactContext, HOME_FEATURE_IDENTIFIER } from '../interface';

export namespace HomeHooks {
  export const useHomeContext = (): HomeReactContext => {
    const featureContext = useContext(FeatureContext);
    // assert that the evoting context exists
    if (!(HOME_FEATURE_IDENTIFIER in featureContext)) {
      throw new Error('Home context could not be found!');
    }
    return featureContext[HOME_FEATURE_IDENTIFIER] as HomeReactContext;
  };

  /**
   * Gets the action creator to connect to a lao
   * @returns The action creator
   */
  export const useConnectToTestLao = () => useHomeContext().connectToTestLao;

  /**
   * Gets the function that sends a network request to create a new lao
   * @returns The function to create a lao
   */
  export const useRequestCreateLao = () => useHomeContext().requestCreateLao;

  /**
   * Gets the function to add a server address to a lao
   * @returns The function to add a server address
   */
  export const useAddLaoServerAddress = () => useHomeContext().addLaoServerAddress;

  /**
   * Gets the current lao list
   * @returns The current lao list
   */
  export const useLaoList = () => useHomeContext().useLaoList();

  /**
   * Gets the lao list component
   * @returns The lao list component
   */
  export const useLaoListComponent = () => useHomeContext().LaoList;

  /**
   * Gets the list of screens to be rendered in the main navigation
   * @returns The list of screens
   */
  export const useMainNavigationScreens = () => useHomeContext().mainNavigationScreens;

  /**
   * Returns a function from the context for obtaining the channel for a given lao
   * @returns A function for getting the channel by lao id
   */
  export const useGetLaoChannel = () => useHomeContext().getLaoChannel;

  /**
   * Gets the current lao id
   * @returns The current lao id
   */
  export const useCurrentLaoId = () => useHomeContext().useCurrentLaoId();

  /**
   * Gets the 'hasSeed' function
   */
  export const useHasSeed = () => {
    // FIXME: route should use proper type
    const navigation = useNavigation<any>();

    const hasSeedFn = useHomeContext().hasSeed;
    const [hasSeed, setHasSeed] = useState<boolean>(hasSeedFn());

    useEffect(() => {
      // Return the function to unsubscribe from the event so it gets removed on unmount
      return navigation.addListener('focus', () => {
        // The screen is now focused, set showScanner to true
        setHasSeed(hasSeedFn());
      });
    }, [navigation, setHasSeed, hasSeedFn]);

    return hasSeed;
  };
}
