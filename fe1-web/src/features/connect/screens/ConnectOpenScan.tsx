import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import QrReader from 'react-qr-reader';
import PropTypes from 'prop-types';
import { useToast } from 'react-native-toast-notifications';

import STRINGS from 'resources/strings';
import PROPS_TYPE from 'resources/Props';
import containerStyles from 'core/styles/stylesheets/containerStyles';
import { Colors } from 'core/styles';
import { WideButtonView } from 'core/components';
import { FOUR_SECONDS } from 'resources/const';

import { ConnectToLao } from '../objects';

/**
 * Starts a QR code scan
 */
const ConnectOpenScan = ({ navigation }: IPropTypes) => {
  // Remove the user to go back to the ConnectEnableCamera as he has already given
  // his permission to use the camera
  const [QrWasScanned, setQrWasScanned] = useState(false);
  const toast = useToast();

  const handleError = (err: string) => {
    console.error(err);
    toast.show(err, {
      type: 'danger',
      placement: 'top',
      duration: FOUR_SECONDS,
    });
  };

  const handleScan = (data: string | null) => {
    if (!data) {
      return;
    }

    console.log(data);
    setQrWasScanned(true);
    try {
      const obj = JSON.parse(data);
      const connectToLao = ConnectToLao.fromJson(obj);
      navigation.navigate(STRINGS.connect_confirm_title, {
        laoIdIn: connectToLao.lao,
        url: connectToLao.server,
      });
    } catch (error) {
      toast.show(STRINGS.connect_scanning_fail, {
        type: 'danger',
        placement: 'top',
        duration: FOUR_SECONDS,
      });
    }
  };

  return QrWasScanned ? (
    <View style={containerStyles.centered} />
  ) : (
    <View style={containerStyles.centered}>
      <QrReader delay={300} onError={handleError} onScan={handleScan} style={{ width: '30%' }} />
      <ActivityIndicator size="large" color={Colors.blue} />
      <WideButtonView
        title={STRINGS.general_button_cancel}
        onPress={() => {
          setQrWasScanned(true);
          navigation.navigate(STRINGS.connect_unapproved_title);
        }}
      />
    </View>
  );
};

const propTypes = {
  navigation: PROPS_TYPE.navigation.isRequired,
};
ConnectOpenScan.propTypes = propTypes;

type IPropTypes = PropTypes.InferProps<typeof propTypes>;

export default ConnectOpenScan;
