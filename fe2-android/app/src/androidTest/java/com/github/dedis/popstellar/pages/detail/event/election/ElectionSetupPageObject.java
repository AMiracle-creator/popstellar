package com.github.dedis.popstellar.pages.detail.event.election;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.matcher.ViewMatchers.isClickable;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static androidx.test.espresso.matcher.ViewMatchers.withHint;
import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.matcher.ViewMatchers.withParent;
import static androidx.test.espresso.matcher.ViewMatchers.withText;
import static org.hamcrest.Matchers.allOf;

import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;

import androidx.test.espresso.ViewInteraction;

import com.github.dedis.popstellar.R;

import org.hamcrest.Description;
import org.hamcrest.Matcher;
import org.hamcrest.TypeSafeMatcher;

public class ElectionSetupPageObject {

  public static ViewInteraction electionName() {
    return onView(
        allOf(
            withId(R.id.election_setup_name),
            withHint(R.string.election_setup_name_hint),
            isDisplayed()));
  }

  public static ViewInteraction addBallot() {
    return onView(
        allOf(
            withId(R.id.add_ballot_option),
            withText(R.string.add_ballot_options_button_text),
            isClickable(),
            isDisplayed()));
  }

  public static ViewInteraction questionText() {
    return onView(
        allOf(
            withId(R.id.election_question),
            withHint(R.string.election_question_hint),
            isDisplayed()));
  }

  public static ViewInteraction ballotOptionAtPosition(int i) {
    return onView(
        allOf(
            withParent(childAtPosition(withId(R.id.election_setup_ballot_options_ll), i)),
            withId(R.id.new_ballot_option_text),
            withHint(R.string.new_ballot_option_hint),
            isDisplayed()));
  }

  public static ViewInteraction addQuestion() {
    return onView(
        allOf(
            withId(R.id.add_question),
            withText(R.string.add_question_button_text),
            isClickable(),
            isDisplayed()));
  }

  public static ViewInteraction writeIn() {
    return onView(allOf(withId(R.id.write_in), isClickable(), isDisplayed()));
  }

  public static ViewInteraction submit() {
    return onView(
        allOf(
            withId(R.id.election_submit_button),
            withText(R.string.submit),
            isClickable(),
            isDisplayed()));
  }

  private static Matcher<View> childAtPosition(
      final Matcher<View> parentMatcher, final int position) {

    return new TypeSafeMatcher<View>() {
      @Override
      public void describeTo(Description description) {
        description.appendText("Child at position " + position + " in parent ");
        parentMatcher.describeTo(description);
      }

      @Override
      public boolean matchesSafely(View view) {
        ViewParent parent = view.getParent();
        return parent instanceof ViewGroup
            && parentMatcher.matches(parent)
            && view.equals(((ViewGroup) parent).getChildAt(position));
      }
    };
  }
}
