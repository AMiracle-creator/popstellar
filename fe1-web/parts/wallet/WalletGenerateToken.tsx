import {
  StyleSheet, TextInput, TextStyle, View, ViewStyle,
} from 'react-native';
import styleContainer from 'styles/stylesheets/container';
import STRINGS from 'res/strings';
import WideButtonView from 'components/WideButtonView';
import PROPS_TYPE from 'res/Props';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { WalletStore } from 'store/stores/WalletStore';
import { Hash, HDWallet } from 'model/objects';
import QRCode from 'components/QRCode';
import { Spacing, Typography } from 'styles';
import TextBlock from 'components/TextBlock';
import CopiableTextBlock from 'components/CopiableTextBlock';

const styles = StyleSheet.create({
  largePadding: {
    padding: '2rem',
  } as ViewStyle,
  textInput: {
    ...Typography.base,
    borderBottomWidth: 2,
    marginVertical: Spacing.s,
    marginHorizontal: Spacing.xl,
  } as TextStyle,
});

const WalletGenerateToken = ({ navigation }: IPropTypes) => {
  const [rollCallId, setRollCallId] = useState('');
  const [laoId, setLaoId] = useState('');
  const [token, setToken] = useState('');
  const [showQRPublicKey, setShowQRPublicKey] = useState(false);

  function showTextInputView() {
    return (
      <View>
        <View style={styles.largePadding} />
        <TextInput
          style={styles.textInput}
          placeholder={STRINGS.identity_insert_lao_id_for_token}
          onChangeText={(input: string) => setLaoId(input)}
        />
        <TextInput
          style={styles.textInput}
          placeholder={STRINGS.identity_insert_roll_call_id_for_token}
          onChangeText={(input: string) => setRollCallId(input)}
        />
        <WideButtonView
          title={STRINGS.identity_generate_token_button_title}
          disabled={rollCallId === '' || laoId === ''}
          onPress={() => {
            WalletStore.get().then((encryptedSeed) => HDWallet
              .fromState(encryptedSeed)
              .then((wallet) => {
                wallet.generateToken(new Hash(laoId), new Hash(rollCallId)).then((popToken) => {
                  setToken(popToken);
                  setShowQRPublicKey(true);
                });
              }));
          }}
        />
      </View>
    );
  }

  function showLaoAndRollCallInfo() {
    return (
      <View style={styleContainer.centered}>
        <TextBlock bold text="LAO ID" />
        <CopiableTextBlock id={0} text={laoId} visibility />
        <TextBlock bold text="Roll Call ID" />
        <CopiableTextBlock id={1} text={rollCallId} visibility />
      </View>
    );
  }

  function getGenerateTokenDisplay() {
    return (
      <View style={styleContainer.centered}>
        {!showQRPublicKey && showTextInputView()}
        <View style={styles.largePadding} />
        <QRCode value={token} visibility={showQRPublicKey} />
        {showQRPublicKey && showLaoAndRollCallInfo()}
        <WideButtonView
          title={STRINGS.cancel_generate_new_token}
          onPress={() => navigation.navigate(STRINGS.navigation_synced_wallet)}
        />
        <View style={styles.largePadding} />
      </View>
    );
  }

  return getGenerateTokenDisplay();
};

const propTypes = {
  navigation: PROPS_TYPE.navigation.isRequired,
};
WalletGenerateToken.propTypes = propTypes;

type IPropTypes = PropTypes.InferProps<typeof propTypes>;

export default WalletGenerateToken;
