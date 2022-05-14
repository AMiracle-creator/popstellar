import PropTypes from 'prop-types';
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import { ParagraphBlock } from 'core/components';
import { Spacing } from 'core/styles';
import { selectIsLaoOrganizer } from 'features/lao/reducer';

import { EventHooks } from '../hooks';
import eventViewStyles from '../styles/eventViewStyles';

/**
 * The Event item component: display the correct representation of the event according to its type,
 * otherwise display its name and in all cases its nested events
 */
const Event = (props: IPropTypes) => {
  const { eventId, eventType, start, end } = props;

  const isOrganizer = useSelector(selectIsLaoOrganizer);
  const eventTypes = EventHooks.useEventTypes();

  const Component = useMemo(() => {
    return eventTypes.find((c) => c.eventType === eventType)?.Component;
  }, [eventType, eventTypes]);

  return (
    <View style={[eventViewStyles.default, { marginTop: Spacing.s }]}>
      {Component ? (
        <Component eventId={eventId} start={start} end={end} isOrganizer={isOrganizer} />
      ) : (
        <ParagraphBlock text={`${eventType} (default event => no mapping in Event.tsx)`} />
      )}
    </View>
  );
};

const propTypes = {
  eventId: PropTypes.string.isRequired,
  eventType: PropTypes.string.isRequired,
  start: PropTypes.number.isRequired,
  end: PropTypes.number,
};
Event.propTypes = propTypes;

Event.defaultProps = {
  end: undefined,
};

type IPropTypes = PropTypes.InferProps<typeof propTypes>;

export default Event;
