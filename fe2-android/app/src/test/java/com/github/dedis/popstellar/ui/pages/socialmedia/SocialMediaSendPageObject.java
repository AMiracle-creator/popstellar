package com.github.dedis.popstellar.ui.pages.socialmedia;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.matcher.ViewMatchers.withId;

import androidx.annotation.StringRes;
import androidx.test.espresso.ViewInteraction;

import com.github.dedis.popstellar.R;

/**
 * This is the page object of SocialMediaSendFragment
 *
 * <p>It makes writing test easier
 */
public class SocialMediaSendPageObject {

  public static ViewInteraction sendChirpButton() {
    return onView(withId(R.id.send_chirp_button));
  }

  public static ViewInteraction entryBoxChirpText() {
    return onView(withId(R.id.entry_box_chirp));
  }

  @StringRes
  public static int nullLaoIdToastText() {
    return R.string.error_no_lao;
  }
}
