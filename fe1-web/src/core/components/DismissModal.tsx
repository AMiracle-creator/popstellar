import PropTypes from 'prop-types';
import React from 'react';
import { Modal, Text, View } from 'react-native';

import { Typography } from 'core/styles';
import STRINGS from 'resources/strings';

import modalStyles from '../styles/stylesheets/modalStyles';
import Button from './Button';

/**
 * A modal used to show an error, that you can close by clicking on a button
 */

const DismissModal = (props: IPropTypes) => {
  const { visibility } = props;
  const { setVisibility } = props;
  const { title } = props;
  const { description } = props;
  const { buttonText } = props;

  return (
    <Modal visible={visibility} transparent>
      <View style={modalStyles.modalView}>
        <View style={modalStyles.titleView}>
          <Text style={modalStyles.modalTitle}>{title}</Text>
        </View>
        <Text style={modalStyles.modalDescription}>{description}</Text>
        <View style={modalStyles.buttonView}>
          <Button onPress={() => setVisibility(!visibility)}>
            <Text style={[Typography.base, Typography.centered, Typography.negative]}>
              {buttonText}
            </Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
};

const propTypes = {
  visibility: PropTypes.bool.isRequired,
  setVisibility: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  buttonText: PropTypes.string,
};

DismissModal.propTypes = propTypes;

DismissModal.defaultProps = {
  buttonText: STRINGS.general_button_ok,
};

type IPropTypes = {
  visibility: boolean;
  setVisibility: Function;
  title: string;
  description: string;
  buttonText: string;
};

export default DismissModal;
