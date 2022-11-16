package com.github.dedis.popstellar.ui.home;

import androidx.test.ext.junit.rules.ActivityScenarioRule;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.RuleChain;
import org.junit.runner.RunWith;
import org.mockito.junit.MockitoJUnit;

import dagger.hilt.android.testing.HiltAndroidRule;
import dagger.hilt.android.testing.HiltAndroidTest;

import static androidx.test.espresso.Espresso.openActionBarOverflowOrOptionsMenu;
import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.*;
import static com.github.dedis.popstellar.testutils.UITestUtils.*;
import static com.github.dedis.popstellar.testutils.pages.home.HomePageObject.*;
import static com.github.dedis.popstellar.testutils.pages.home.LaoCreatePageObject.createFragmentId;
import static com.github.dedis.popstellar.testutils.pages.home.WalletPageObject.confirmButton;
import static com.github.dedis.popstellar.testutils.pages.home.WalletPageObject.walletId;
import static org.hamcrest.Matchers.allOf;

@HiltAndroidTest
@RunWith(AndroidJUnit4.class)
public class HomeActivityTest {

  //  Hilt rule
  private final HiltAndroidRule hiltAndroidRule = new HiltAndroidRule(this);

  // Activity scenario rule that starts the activity.
  public ActivityScenarioRule<HomeActivity> activityScenarioRule =
      new ActivityScenarioRule<>(HomeActivity.class);

  @Rule
  public final RuleChain rule =
      RuleChain.outerRule(MockitoJUnit.testRule(this))
          .around(hiltAndroidRule)
          .around(activityScenarioRule);

  @Test
  public void createButtonBringsToCreateScreen() {
    initializeWallet(activityScenarioRule);
    createButton().perform(click());
    fragmentContainer().check(matches(withChild(withId(createFragmentId()))));
  }

  @Test
  public void logOutMenuTest() {
    initializeWallet(activityScenarioRule);
    openActionBarOverflowOrOptionsMenu(
        InstrumentationRegistry.getInstrumentation().getTargetContext());
    walletLogOutMenuItem().perform(click());
    assertThat(dialogPositiveButton(), allOf(withText("CONFIRM"), isDisplayed()));
    assertThat(dialogNegativeButton(), allOf(withText("CANCEL"), isDisplayed()));
    dialogPositiveButton().performClick();
    fragmentContainer().check(matches(withChild(withId(walletId()))));
  }

  @Test
  public void clearDataTest() {
    initializeWallet(activityScenarioRule);
    openActionBarOverflowOrOptionsMenu(
        InstrumentationRegistry.getInstrumentation().getTargetContext());
    clearDataMenuItem().perform(click());
    assertThat(dialogPositiveButton(), allOf(withText("YES"), isDisplayed()));
    assertThat(dialogNegativeButton(), allOf(withText("NO"), isDisplayed()));
  }

  public static void initializeWallet(
      ActivityScenarioRule<HomeActivity> activityActivityScenarioRule) {
    activityActivityScenarioRule
        .getScenario()
        .onActivity(
            activity -> {
              HomeViewModel viewModel = HomeActivity.obtainViewModel(activity);
              if (!viewModel.isWalletSetUp()) {
                dialogNeutralButton().performClick();
                confirmButton().perform(click());
                dialogPositiveButton().performClick();
              }
            });
  }
}
