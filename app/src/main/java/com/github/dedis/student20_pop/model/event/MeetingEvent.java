package com.github.dedis.student20_pop.model.event;

import androidx.databinding.ObservableArrayList;

import com.github.dedis.student20_pop.model.entities.Meeting;
import com.github.dedis.student20_pop.model.entities.MeetingAndModification;
import com.github.dedis.student20_pop.model.entities.RollCall;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

import static com.github.dedis.student20_pop.model.event.EventType.MEETING;

/** Class modeling a Meeting Event */
public class MeetingEvent extends Event {

  private final long endTime;
  private final String description;

  /**
   * Constructor for a Meeting Event
   *
   * @param name the name of the meeting event
   * @param startTime the start time of the meeting event
   * @param endTime the end time of the meeting event
   * @param lao the ID of the associated LAO
   * @param location the location of the meeting event
   * @param description the description of the meeting event
   * @throws IllegalArgumentException if any of the parameters is null
   */
  public MeetingEvent(
      String name, long startTime, long endTime, String lao, String location, String description) {
    super(name, lao, startTime, location, MEETING);
    if (description == null) {
      throw new IllegalArgumentException("Trying to create a meeting with a null description");
    }
    this.endTime = endTime;
    this.description = description;
  }

  /** Returns the end time of the Meeting. */
  public long getEndTime() {
    return endTime;
  }

  /** Returns the description of the Meeting. */
  public String getDescription() {
    return description;
  }

  /** Transform a list of meeting entities into a list of meeting events */
  public static List<MeetingEvent> transformMeetings(List<MeetingAndModification> meetings) {
    if(meetings == null) return new ArrayList<>();
    return meetings.stream().map(m -> m.meeting).map(MeetingEvent::transformMeeting).collect(Collectors.toList());
  }

  /** Transform a meeting entity into a meeting event */
  public static MeetingEvent transformMeeting(Meeting meeting) {
    return new MeetingEvent(meeting.name, meeting.start, meeting.end, meeting.laoChannel,
            meeting.location, meeting.extra);
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;
    if (o == null || getClass() != o.getClass()) return false;
    if (!super.equals(o)) return false;
    MeetingEvent that = (MeetingEvent) o;
    return Objects.equals(endTime, that.endTime) && Objects.equals(description, that.description);
  }

  @Override
  public int hashCode() {
    return Objects.hash(super.hashCode(), endTime, description);
  }
}
