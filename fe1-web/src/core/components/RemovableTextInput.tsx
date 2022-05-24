import PropTypes from 'prop-types';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

import { Color, Icon, Spacing } from '../styles';
import DeleteIcon from './icons/DeleteIcon';
import Input from './Input';

/**
 * TextInput component which is removable by clicking the trashcan
 * It is used by the TextInputList.tsx component
 */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  icon: {
    marginLeft: Spacing.x1,
    marginBottom: Spacing.x1,
  },
});

const RemovableTextInput = (props: IPropTypes) => {
  const { onRemove, onChange, id, value, placeholder } = props;

  return (
    <View style={styles.container}>
      <Input
        placeholder={placeholder || ''}
        onChange={(text: string) => onChange(id, text)}
        key={id}
        value={value || ''}
      />
      <TouchableOpacity containerStyle={styles.icon} onPress={() => onRemove(id)}>
        <DeleteIcon color={Color.primary} size={Icon.size} />
      </TouchableOpacity>
    </View>
  );
};

const propTypes = {
  onRemove: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  id: PropTypes.number.isRequired,
  value: PropTypes.string,
  placeholder: PropTypes.string,
};

RemovableTextInput.propTypes = propTypes;

RemovableTextInput.defaultProps = {
  value: '',
  placeholder: '',
};

type IPropTypes = PropTypes.InferProps<typeof propTypes>;

export default RemovableTextInput;
