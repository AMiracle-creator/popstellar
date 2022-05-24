import { CompositeScreenProps } from '@react-navigation/core';
import { useNavigation } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Platform, Text } from 'react-native';
import { useToast } from 'react-native-toast-notifications';

import { ConfirmModal, DatePicker, DismissModal, Button, Input } from 'core/components';
import { onChangeEndTime, onChangeStartTime } from 'core/components/DatePicker';
import ScreenWrapper from 'core/components/ScreenWrapper';
import { onConfirmEventCreation } from 'core/functions/UI';
import { AppParamList } from 'core/navigation/typing/AppParamList';
import { LaoEventsParamList } from 'core/navigation/typing/LaoEventsParamList';
import { LaoParamList } from 'core/navigation/typing/LaoParamList';
import { Timestamp } from 'core/objects';
import { Typography } from 'core/styles';
import { FOUR_SECONDS } from 'resources/const';
import STRINGS from 'resources/strings';

import { RollCallHooks } from '../hooks';
import { requestCreateRollCall } from '../network';

const DEFAULT_ROLL_CALL_DURATION = 3600;

type NavigationProps = CompositeScreenProps<
  StackScreenProps<LaoEventsParamList, typeof STRINGS.navigation_lao_events_creation_roll_call>,
  CompositeScreenProps<
    StackScreenProps<LaoParamList, typeof STRINGS.navigation_lao_events>,
    StackScreenProps<AppParamList, typeof STRINGS.navigation_app_lao>
  >
>;

/**
 * Screen to create a roll-call event
 *
 * TODO Send the Roll-call event in an open state to the organization server
 *  when the confirm button is press
 */
const CreateRollCall = () => {
  const navigation = useNavigation<NavigationProps['navigation']>();
  const toast = useToast();

  const laoId = RollCallHooks.useCurrentLaoId();

  const [proposedStartTime, setProposedStartTime] = useState(Timestamp.EpochNow());
  const [proposedEndTime, setProposedEndTime] = useState(
    Timestamp.EpochNow().addSeconds(DEFAULT_ROLL_CALL_DURATION),
  );

  const [rollCallName, setRollCallName] = useState('');
  const [rollCallLocation, setRollCallLocation] = useState('');
  const [rollCallDescription, setRollCallDescription] = useState('');
  const [modalEndIsVisible, setModalEndIsVisible] = useState(false);
  const [modalStartIsVisible, setModalStartIsVisible] = useState(false);

  const buildDatePickerWeb = () => {
    const startDate = proposedStartTime.toDate();
    const endDate = proposedEndTime.toDate();

    return (
      <>
        <Text style={[Typography.paragraph, Typography.important]}>
          {STRINGS.roll_call_create_proposed_start}
        </Text>
        <DatePicker
          selected={startDate}
          onChange={(date: Date) =>
            onChangeStartTime(
              date,
              setProposedStartTime,
              setProposedEndTime,
              DEFAULT_ROLL_CALL_DURATION,
            )
          }
        />

        <Text style={[Typography.paragraph, Typography.important]}>
          {STRINGS.roll_call_create_proposed_end}
        </Text>
        <DatePicker
          selected={endDate}
          onChange={(date: Date) => onChangeEndTime(date, proposedStartTime, setProposedEndTime)}
        />
      </>
    );
  };

  const buttonsVisibility: boolean = rollCallName !== '' && rollCallLocation !== '';

  const createRollCall = () => {
    const description = rollCallDescription === '' ? undefined : rollCallDescription;
    requestCreateRollCall(
      laoId,
      rollCallName,
      rollCallLocation,
      proposedStartTime,
      proposedEndTime,
      description,
    )
      .then(() => {
        navigation.navigate(STRINGS.navigation_lao_events_home);
      })
      .catch((err) => {
        console.error('Could not create roll call, error:', err);
        toast.show(`Could not create roll call, error: ${err}`, {
          type: 'danger',
          placement: 'top',
          duration: FOUR_SECONDS,
        });
      });
  };

  return (
    <ScreenWrapper>
      {/* see archive branches for date picker used for native apps */}
      {Platform.OS === 'web' && buildDatePickerWeb()}

      <Text style={[Typography.paragraph, Typography.important]}>
        {STRINGS.roll_call_create_name}
      </Text>
      <Input
        value={rollCallName}
        onChange={setRollCallName}
        placeholder={STRINGS.roll_call_create_name_placeholder}
      />

      <Text style={[Typography.paragraph, Typography.important]}>
        {STRINGS.roll_call_create_location_placeholder}
      </Text>
      <Input
        value={rollCallLocation}
        onChange={setRollCallLocation}
        placeholder={STRINGS.roll_call_create_location_placeholder}
      />

      <Text style={[Typography.paragraph, Typography.important]}>
        {STRINGS.roll_call_create_description}
      </Text>
      <Input
        value={rollCallDescription}
        onChange={setRollCallDescription}
        placeholder={STRINGS.roll_call_create_description_placeholder}
      />

      <Button
        onPress={() =>
          onConfirmEventCreation(
            proposedStartTime,
            proposedEndTime,
            createRollCall,
            setModalStartIsVisible,
            setModalEndIsVisible,
          )
        }
        disabled={!buttonsVisibility}>
        <Text style={[Typography.base, Typography.centered, Typography.negative]}>
          {STRINGS.general_button_confirm}
        </Text>
      </Button>

      <DismissModal
        visibility={modalEndIsVisible}
        setVisibility={setModalEndIsVisible}
        title={STRINGS.modal_event_creation_failed}
        description={STRINGS.modal_event_ends_in_past}
      />
      <ConfirmModal
        visibility={modalStartIsVisible}
        setVisibility={setModalStartIsVisible}
        title={STRINGS.modal_event_creation_failed}
        description={STRINGS.modal_event_starts_in_past}
        onConfirmPress={() => createRollCall()}
        buttonConfirmText={STRINGS.modal_button_start_now}
        buttonCancelText={STRINGS.modal_button_go_back}
      />
    </ScreenWrapper>
  );
};

export default CreateRollCall;
