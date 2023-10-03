package com.github.dedis.popstellar.repository;

import android.app.Application;

import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import com.github.dedis.popstellar.model.objects.Meeting;
import com.github.dedis.popstellar.repository.database.AppDatabase;
import com.github.dedis.popstellar.repository.database.event.meeting.MeetingDao;
import com.github.dedis.popstellar.utility.error.UnknownMeetingException;

import org.junit.*;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnit;
import org.mockito.junit.MockitoRule;

import java.util.*;

import io.reactivex.Completable;
import io.reactivex.Single;
import io.reactivex.observers.TestObserver;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@RunWith(AndroidJUnit4.class)
public class MeetingRepositoryTest {
  private static final Application APPLICATION = ApplicationProvider.getApplicationContext();
  @Mock private static AppDatabase appDatabase;
  @Mock private static MeetingDao meetingDao;
  private static MeetingRepository meetingRepository;
  private static final String LAO_ID = "LAO_ID";
  private static final String ID = "ID";
  private static final String NAME = "MEETING_NAME";
  private static final String LOCATION = "Test Location";
  private static final long CREATION = System.currentTimeMillis();
  private static final long START = CREATION + 1000;
  private static final long END = START + 1000;
  private static final long LAST_MODIFIED = CREATION;
  private static final String MODIFICATION_ID = "MOD_ID";
  private static final List<String> MODIFICATION_SIGNATURES = new ArrayList<>();
  private static final Meeting meeting =
      new Meeting(
          ID,
          NAME,
          CREATION,
          START,
          END,
          LOCATION,
          LAST_MODIFIED,
          MODIFICATION_ID,
          MODIFICATION_SIGNATURES);

  @Rule(order = 0)
  public final MockitoRule mockitoRule = MockitoJUnit.rule();

  @Before
  public void setUp() {
    when(appDatabase.meetingDao()).thenReturn(meetingDao);
    meetingRepository = new MeetingRepository(appDatabase, APPLICATION);

    when(meetingDao.insert(any())).thenReturn(Completable.complete());
    when(meetingDao.getMeetingsByLaoId(anyString()))
        .thenReturn(Single.just(Collections.emptyList()));
    meetingRepository.updateMeeting(LAO_ID, meeting);
  }

  @Test
  public void addMeetingAddsMeetingToRepository() throws UnknownMeetingException {
    Meeting retrievedMeeting = meetingRepository.getMeetingWithId(LAO_ID, ID);
    assertEquals(meeting, retrievedMeeting);
  }

  @Test(expected = IllegalArgumentException.class)
  public void addMeetingThrowsExceptionWhenLaoIdIsNull() {
    meetingRepository.updateMeeting(null, meeting);
  }

  @Test(expected = IllegalArgumentException.class)
  public void addMeetingThrowsExceptionWhenMeetingIsNull() {
    meetingRepository.updateMeeting(LAO_ID, null);
  }

  @Test(expected = UnknownMeetingException.class)
  public void getMeetingWithIdThrowsExceptionWhenMeetingDoesNotExist()
      throws UnknownMeetingException {
    meetingRepository.getMeetingWithId(LAO_ID, ID + "2");
  }

  @Test
  public void getMeetingsObservableInLaoReturnsObservableOfMeetings() {
    TestObserver<Set<Meeting>> observer = new TestObserver<>();
    meetingRepository.getMeetingsObservableInLao(LAO_ID).subscribe(observer);

    observer.awaitCount(1);
    Set<Meeting> meetings = observer.values().get(0);
    assertTrue(meetings.contains(meeting));
  }
}
