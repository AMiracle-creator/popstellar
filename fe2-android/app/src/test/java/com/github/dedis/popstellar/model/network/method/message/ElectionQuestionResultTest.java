package com.github.dedis.popstellar.model.network.method.message;

import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.junit.Assert.assertThrows;

import com.github.dedis.popstellar.model.network.method.message.data.election.ElectionResultQuestion;
import com.github.dedis.popstellar.model.network.method.message.data.election.QuestionResult;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.Test;

public class ElectionQuestionResultTest {

  private String questionId = "questionId";
  private List<QuestionResult> results = Arrays.asList(new QuestionResult("Candidate1", 30));
  private ElectionResultQuestion electionQuestionResult = new ElectionResultQuestion(questionId,
      results);

  @Test
  public void electionQuestionResultGetterReturnsCorrectQuestionId() {
    assertThat(electionQuestionResult.getId(), is(questionId));
  }

  @Test
  public void electionQuestionResultGetterReturnsCorrectResults() {
    assertThat(electionQuestionResult.getResult(), is(results));
  }

  @Test
  public void fieldsCantBeNull() {
    assertThrows(IllegalArgumentException.class, () -> new ElectionResultQuestion(null, results));
    assertThrows(IllegalArgumentException.class,
        () -> new ElectionResultQuestion(questionId, null));
  }

  @Test
  public void resultsCantBeEmpty() {
    List<QuestionResult> emptyList = new ArrayList<>();
    assertThrows(IllegalArgumentException.class,
        () -> new ElectionResultQuestion(questionId, emptyList));
  }
}
