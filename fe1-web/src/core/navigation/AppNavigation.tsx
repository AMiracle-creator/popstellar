import { createStackNavigator } from '@react-navigation/stack';
import PropTypes from 'prop-types';
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import STRINGS from 'resources/strings';

import { AppParamList } from './typing/AppParamList';

/**
 * Define the App stack navigation
 * Contains to navigation: the home navigation and the organization navigation
 */

const Stack = createStackNavigator<AppParamList>();

const styles = StyleSheet.create({
  view: {
    flex: 1,
  },
});

const AppNavigation = ({ screens }: IPropTypes) => {
  const entries = screens.map(({ id, title, component }) => (
    // make the reasonable assumption that we haven't passed strings as components here
    <Stack.Screen name={id} key={id} component={component} options={{ title: title || id }} />
  ));

  return (
    <SafeAreaView style={styles.view}>
      <Stack.Navigator
        initialRouteName={STRINGS.navigation_app_wallet_create_seed}
        screenOptions={{
          headerShown: false,
        }}>
        {entries}
      </Stack.Navigator>
    </SafeAreaView>
  );
};

const propTypes = {
  screens: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string,
      component: PropTypes.elementType.isRequired,
    }).isRequired,
  ).isRequired,
};
AppNavigation.propTypes = propTypes;

AppNavigation.defaultProps = {};

export type AppScreen = {
  id: keyof AppParamList;
  title?: string | undefined;
  component: React.ComponentType;
};

type IPropTypes = Omit<PropTypes.InferProps<typeof propTypes>, 'screens'> & {
  screens: AppScreen[];
};

export default AppNavigation;
