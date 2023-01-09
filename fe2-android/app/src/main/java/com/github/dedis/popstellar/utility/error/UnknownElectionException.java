package com.github.dedis.popstellar.utility.error;

import com.github.dedis.popstellar.R;

public class UnknownElectionException extends GenericException {

  public UnknownElectionException() {
    super("Could not find a valid election");
  }

  public UnknownElectionException(String electionId) {
    super("Could not find election with id " + electionId);
  }

  @Override
  public int getUserMessage() {
    return R.string.unknown_election_exception;
  }

  @Override
  public Object[] getUserMessageArguments() {
    return new Object[0];
  }
}
