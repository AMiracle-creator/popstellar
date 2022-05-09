import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';

import { Colors } from '../styles';
import circularButtonStyles from '../styles/stylesheets/circularButtonStyles';

/**
 * Recorder button that executes an onPress action given in props
 *
 * Displays a different icon depending if the witness is currently recording or not
 */

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
    backgroundColor: Colors.white,
    borderRadius: 30,
  } as ViewStyle,
  iconRecording: {
    borderRadius: 5,
  } as ViewStyle,
  iconNotRecording: {
    borderRadius: 30,
  } as ViewStyle,
});

function RecorderButton({ action }: IPropTypes) {
  const [isRecording, setIsRecording] = useState(false);

  return (
    <TouchableOpacity
      style={[circularButtonStyles.button, { backgroundColor: Colors.red }]}
      onPress={() => {
        action();
        setIsRecording(!isRecording);
      }}>
      <View
        style={
          isRecording
            ? [styles.center, styles.iconRecording]
            : [styles.center, styles.iconNotRecording]
        }
      />
    </TouchableOpacity>
  );
}

const propTypes = {
  action: PropTypes.func.isRequired,
};
RecorderButton.prototype = propTypes;

type IPropTypes = PropTypes.InferProps<typeof propTypes>;

export default RecorderButton;
