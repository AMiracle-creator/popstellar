package com.github.dedis.popstellar.ui.pages.detail;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.matcher.ViewMatchers.withId;

import androidx.annotation.IdRes;
import androidx.test.espresso.ViewInteraction;

import com.github.dedis.popstellar.R;
import com.github.dedis.popstellar.ui.detail.LaoDetailActivity;
import com.github.dedis.popstellar.utility.Constants;

/**
 * Page object of {@link LaoDetailActivity}
 *
 * <p>Creation : 04/12/2021
 */
public class LaoDetailActivityPageObject {

  public static ViewInteraction fragmentContainer() {
    return onView(withId(R.id.fragment_container_lao_detail));
  }

  public static ViewInteraction identityButton() {
    return onView(withId(R.id.lao_detail_identity_menu));
  }



  public static ViewInteraction witnessButton() {
    return onView(withId(R.id.lao_detail_witnessing_menu));
  }

  @IdRes
  public static int laoDetailFragmentId() {
    return R.id.fragment_lao_detail;
  }

  @IdRes
  public static int identityFragmentId() {
    return R.id.fragment_identity;
  }

  @IdRes
  public static int witnessingFragmentId() {
    return R.id.fragment_witnessing;
  }

  public static int containerId() {
    return R.id.fragment_container_lao_detail;
  }

  public static String laoIdExtra() {
    return Constants.LAO_ID_EXTRA;
  }

  public static String fragmentToOpenExtra() {
    return Constants.FRAGMENT_TO_OPEN_EXTRA;
  }

  public static String laoDetailValue() {
    return Constants.LAO_DETAIL_EXTRA;
  }
}
