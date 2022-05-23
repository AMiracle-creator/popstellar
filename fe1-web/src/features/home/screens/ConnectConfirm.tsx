import { CompositeScreenProps, useNavigation, useRoute } from '@react-navigation/core';
import { StackScreenProps } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useToast } from 'react-native-toast-notifications';

import { TextBlock, TextInputLine, Button } from 'core/components';
import ScreenWrapper from 'core/components/ScreenWrapper';
import { AppParamList } from 'core/navigation/typing/AppParamList';
import { ConnectParamList } from 'core/navigation/typing/ConnectParamList';
import { getNetworkManager, subscribeToChannel } from 'core/network';
import { NetworkConnection } from 'core/network/NetworkConnection';
import { Typography } from 'core/styles';
import containerStyles from 'core/styles/stylesheets/containerStyles';
import { FOUR_SECONDS } from 'resources/const';
import STRINGS from 'resources/strings';

import { HomeHooks } from '../hooks';

/**
 * Ask for confirmation to connect to a specific LAO
 * The ScrollView shows information for the user to verify the authenticity of the LAO
 *
 * TODO Make the confirm button make the action require in the UI specification
 */

/**
 * Connects to the given server URL.
 *
 * @param serverUrl
 */
export function connectTo(serverUrl: string): NetworkConnection | undefined {
  try {
    const { href } = new URL(serverUrl); // validate
    return getNetworkManager().connect(href);
  } catch (err) {
    console.error(`Cannot connect to '${serverUrl}' as it is an invalid URL`, err);
    return undefined;
  }
}

type NavigationProps = CompositeScreenProps<
  StackScreenProps<ConnectParamList, typeof STRINGS.navigation_connect_confirm>,
  StackScreenProps<AppParamList, typeof STRINGS.navigation_app_home>
>;

const ConnectConfirm = () => {
  const navigation = useNavigation<NavigationProps['navigation']>();
  const route = useRoute<NavigationProps['route']>();

  const laoIdIn = route.params?.laoId || '';
  const url = route.params?.serverUrl || 'ws://localhost:9000/organizer/client';
  const [serverUrl, setServerUrl] = useState(url);
  const [laoId, setLaoId] = useState(laoIdIn);

  const toast = useToast();
  const getLaoChannel = HomeHooks.useGetLaoChannel();

  const onButtonConfirm = async () => {
    const connection = connectTo(serverUrl);
    if (!connection) {
      return;
    }

    try {
      const channel = getLaoChannel(laoId);
      if (!channel) {
        throw new Error('The given LAO ID is invalid');
      }

      // subscribe to the lao channel on the new connection
      await subscribeToChannel(channel, [connection]);

      navigation.navigate(STRINGS.navigation_app_lao, {
        screen: STRINGS.navigation_lao_home,
      });
    } catch (err) {
      console.error(`Failed to establish lao connection: ${err}`);
      toast.show(`Failed to establish lao connection: ${err}`, {
        type: 'danger',
        placement: 'top',
        duration: FOUR_SECONDS,
      });
    }
  };

  return (
    <ScreenWrapper>
      <View style={containerStyles.flex}>
        <TextBlock text={STRINGS.connect_confirm_description} />
        <TextInputLine
          placeholder={STRINGS.connect_server_uri}
          onChangeText={(input: string) => setServerUrl(input)}
          defaultValue={serverUrl}
        />
        <TextInputLine
          placeholder={STRINGS.connect_lao_id}
          onChangeText={(input: string) => setLaoId(input)}
          defaultValue={laoId}
        />

        <Button onPress={onButtonConfirm}>
          <Text style={[Typography.base, Typography.centered, Typography.negative]}>
            {STRINGS.general_button_confirm}
          </Text>
        </Button>
        <Button onPress={navigation.goBack}>
          <Text style={[Typography.base, Typography.centered, Typography.negative]}>
            {STRINGS.general_button_cancel}
          </Text>
        </Button>
      </View>
    </ScreenWrapper>
  );
};

export default ConnectConfirm;
