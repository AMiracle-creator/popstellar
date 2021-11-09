import React from 'react';
import PropTypes from 'prop-types';
import {
  StyleSheet, View, ViewStyle, Modal, TextStyle, Text
} from 'react-native';
import STRINGS from 'res/strings';
import { white } from 'styles/colors';
import { Views, Typography } from 'styles';
import WideButtonView from './WideButtonView';

const styles = StyleSheet.create({
  modalView: {
    ...Views.base,
    backgroundColor: white,
    borderRadius: 10,
    borderWidth: 1,
    margin: 'auto',
    height: 200,
    width: 600,
  } as ViewStyle,
  modalTitle: {
    ...Typography.important,
    alignSelf: 'flex-start',
    padding: '10',
  } as TextStyle,
  modalDescription: {
    ...Typography.base,
    alignSelf: 'flex-start',
    padding: '10',
  } as TextStyle,
});

const ConfirmModal = (props: IPropTypes) => {
  const { visibility } = props;
  const { setVisibility } = props;
  const { title } = props;
  const { description } = props;
  const { buttonCancelText } = props;
  const { buttonConfirmText } = props;
  const { onConfirmPress } = props;

  return (
    <Modal
      visible={visibility}
      onRequestClose={() => setVisibility(!visibility)}
      transparent
    >
      <View style={styles.modalView}>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalDescription}>{description}</Text>
        <WideButtonView
          title={buttonConfirmText}
          onPress={() => onConfirmPress()}
        />
        <WideButtonView
          title={buttonCancelText}
          onPress={() => setVisibility(!visibility)}
        />
      </View>
    </Modal>
  );
};

const propTypes = {
  visibility: PropTypes.bool.isRequired,
  setVisibility: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  buttonCancelText: PropTypes.string,
  buttonConfirmText: PropTypes.string,
  onConfirmPress: PropTypes.func.isRequired,
};

ConfirmModal.propTypes = propTypes;

ConfirmModal.defaultProps = {
  buttonCancelText: STRINGS.general_button_cancel,
  buttonConfirmText: STRINGS.general_button_confirm,
};

type IPropTypes = {
  visibility: boolean,
  setVisibility: Function,
  title: string,
  description: string,
  buttonCancelText: string,
  buttonConfirmText: string,
  onConfirmPress: Function,
};

export default ConfirmModal;
