package com.github.dedis.popstellar.utility.handler.data;

import com.github.dedis.popstellar.model.network.method.message.data.Data;
import com.github.dedis.popstellar.model.network.method.message.data.consensus.*;
import com.github.dedis.popstellar.model.objects.*;
import com.github.dedis.popstellar.model.objects.security.MessageID;
import com.github.dedis.popstellar.model.objects.security.PublicKey;
import com.github.dedis.popstellar.model.objects.view.LaoView;
import com.github.dedis.popstellar.repository.*;
import com.github.dedis.popstellar.utility.error.*;
import java.util.Optional;
import java.util.Set;
import javax.inject.Inject;
import timber.log.Timber;

public final class ConsensusHandler {

  public static final String TAG = ConsensusHandler.class.getSimpleName();

  private final LAORepository laoRepo;
  private final WitnessingRepository witnessingRepo;
  private final ConsensusRepository consensusRepository;

  @Inject
  public ConsensusHandler(
      LAORepository laoRepo,
      WitnessingRepository witnessingRepo,
      ConsensusRepository consensusRepository) {
    this.laoRepo = laoRepo;
    this.witnessingRepo = witnessingRepo;
    this.consensusRepository = consensusRepository;
  }

  /**
   * Process an Elect message.
   *
   * @param context the HandlerContext of the message
   * @param consensusElect the data of the message that was received
   */
  public void handleElect(HandlerContext context, ConsensusElect consensusElect)
      throws UnknownLaoException {
    Channel channel = context.getChannel();
    MessageID messageId = context.getMessageId();
    PublicKey senderPk = context.getSenderPk();

    Timber.tag(TAG).d("handleElect: channel: %s, id: %s", channel, consensusElect.getInstanceId());

    LaoView laoView = laoRepo.getLaoViewByChannel(channel);
    Set<PublicKey> nodes = witnessingRepo.getWitnesses(laoView.getId());
    nodes.add(laoView.getOrganizer());

    ElectInstance electInstance =
        new ElectInstance(messageId, channel, senderPk, nodes, consensusElect);

    consensusRepository.updateElectInstanceByLao(laoView.getId(), electInstance);
    consensusRepository.updateNodesByChannel(laoView.getChannel());
  }

  public void handleElectAccept(HandlerContext context, ConsensusElectAccept consensusElectAccept)
      throws DataHandlingException, UnknownLaoException {
    Channel channel = context.getChannel();
    MessageID messageId = context.getMessageId();
    PublicKey senderPk = context.getSenderPk();

    Timber.tag(TAG)
        .d("handleElectAccept: channel: %s, id: %s", channel, consensusElectAccept.getInstanceId());
    LaoView laoView = laoRepo.getLaoViewByChannel(channel);

    Optional<ElectInstance> electInstanceOpt =
        consensusRepository.getElectInstance(laoView.getId(), consensusElectAccept.getMessageId());
    if (!electInstanceOpt.isPresent()) {
      Timber.tag(TAG)
          .w("elect_accept for invalid messageId : %s", consensusElectAccept.getMessageId());
      throw new InvalidMessageIdException(
          consensusElectAccept, consensusElectAccept.getMessageId());
    }

    ElectInstance electInstance = electInstanceOpt.get();
    electInstance.addElectAccept(senderPk, messageId, consensusElectAccept);

    consensusRepository.updateElectInstanceByLao(laoView.getId(), electInstance);
    consensusRepository.updateNodesByChannel(laoView.getChannel());
  }

  @SuppressWarnings("unused")
  public <T extends Data> void handleBackend(HandlerContext context, T data) {
    Timber.tag(TAG)
        .w("Received a consensus message only for backend with action: %s", data.getAction());
  }

  public void handleLearn(HandlerContext context, ConsensusLearn consensusLearn)
      throws DataHandlingException, UnknownLaoException {
    Channel channel = context.getChannel();

    Timber.tag(TAG).d("handleLearn: channel: %s, id: %s", channel, consensusLearn.getInstanceId());
    LaoView laoView = laoRepo.getLaoViewByChannel(channel);

    Optional<ElectInstance> electInstanceOpt =
        consensusRepository.getElectInstance(laoView.getId(), consensusLearn.getMessageId());
    if (!electInstanceOpt.isPresent()) {
      Timber.tag(TAG).w("learn for invalid messageId : %s", consensusLearn.getMessageId());
      throw new InvalidMessageIdException(consensusLearn, consensusLearn.getMessageId());
    }

    ElectInstance electInstance = electInstanceOpt.get();

    if (consensusLearn.getLearnValue().isDecision()) {
      electInstance.setState(ElectInstance.State.ACCEPTED);
    }

    consensusRepository.updateElectInstanceByLao(laoView.getId(), electInstance);
    consensusRepository.updateNodesByChannel(laoView.getChannel());
  }

  public void handleConsensusFailure(HandlerContext context, ConsensusFailure failure)
      throws UnknownLaoException, InvalidMessageIdException {
    Channel channel = context.getChannel();

    Timber.tag(TAG)
        .d("handleConsensusFailure: channel: %s, id: %s", channel, failure.getInstanceId());
    LaoView laoView = laoRepo.getLaoViewByChannel(channel);

    Optional<ElectInstance> electInstanceOpt =
        consensusRepository.getElectInstance(laoView.getId(), failure.getMessageId());
    if (!electInstanceOpt.isPresent()) {
      Timber.tag(TAG).w("Failure for invalid messageId : %s", failure.getMessageId());
      throw new InvalidMessageIdException(failure, failure.getMessageId());
    }

    ElectInstance electInstance = electInstanceOpt.get();
    electInstance.setState(ElectInstance.State.FAILED);

    consensusRepository.updateElectInstanceByLao(laoView.getId(), electInstance);
    consensusRepository.updateNodesByChannel(laoView.getChannel());
  }
}
