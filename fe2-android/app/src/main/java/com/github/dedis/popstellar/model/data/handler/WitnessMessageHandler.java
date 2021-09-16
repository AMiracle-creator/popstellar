package com.github.dedis.popstellar.model.data.handler;

import android.util.Log;
import com.github.dedis.popstellar.model.Lao;
import com.github.dedis.popstellar.model.PendingUpdate;
import com.github.dedis.popstellar.model.WitnessMessage;
import com.github.dedis.popstellar.model.data.LAORepository;
import com.github.dedis.popstellar.model.network.method.message.MessageGeneral;
import com.github.dedis.popstellar.model.network.method.message.PublicKeySignaturePair;
import com.github.dedis.popstellar.model.network.method.message.data.message.WitnessMessageSignature;
import com.github.dedis.popstellar.utility.security.Signature;
import java.util.Base64;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Witness messages handler class
 */
public class WitnessMessageHandler {

  public static final String TAG = WitnessMessage.class.getSimpleName();

  /**
   * Process a WitnessMessageSignature message.
   *
   * @param laoRepository the repository to access the LAO of the channel
   * @param channel       the channel on which the message was received
   * @param senderPk      the public key of the sender
   * @param message       the message that was received
   * @return true if the message cannot be processed and false otherwise
   */
  public static boolean handleWitnessMessage(LAORepository laoRepository, String channel,
      String senderPk,
      WitnessMessageSignature message) {
    Log.d(TAG, "Received Witness Message Signature Broadcast");
    String messageId = message.getMessageId();
    String signature = message.getSignature();

    byte[] senderPkBuf = Base64.getUrlDecoder().decode(senderPk);
    byte[] signatureBuf = Base64.getUrlDecoder().decode(signature);

    // Verify signature
    if (!Signature.verifySignature(messageId, senderPkBuf, signatureBuf)) {
      return false;
    }

    if (laoRepository.getMessageById().containsKey(messageId)) {
      // Update the message
      MessageGeneral msg = laoRepository.getMessageById().get(messageId);
      msg.getWitnessSignatures().add(new PublicKeySignaturePair(senderPkBuf, signatureBuf));
      Log.d(TAG, "Message General updated with the new Witness Signature");

      Lao lao = laoRepository.getLaoByChannel(channel);
      if (lao == null) {
        Log.d(TAG, "failed to retrieve the lao with channel " + channel);
        return false;
      }
      // Update WitnessMessage of the corresponding lao
      if (!updateWitnessMessage(lao, messageId, senderPk)) {
        return false;
      }
      Log.d(TAG, "WitnessMessage successfully updated");

      Set<PendingUpdate> pendingUpdates = lao.getPendingUpdates();
      // Check if any pending update contains messageId
      if (pendingUpdates.stream().anyMatch(ob -> ob.getMessageId().equals(messageId))) {
        // We're waiting to collect signatures for this one
        Log.d(TAG, "There is a pending update for this message");

        // Let's check if we have enough signatures
        Set<String> signaturesCollectedSoFar =
            msg.getWitnessSignatures().stream()
                .map(ob -> Base64.getUrlEncoder().encodeToString(ob.getWitness()))
                .collect(Collectors.toSet());
        if (lao.getWitnesses().equals(signaturesCollectedSoFar)) {
          Log.d(TAG, "We have enough signatures for the UpdateLao so we can send a StateLao");

          // We send a state lao if we are the organizer
          // TODO: move this somewhere else
          laoRepository.sendStateLao(lao, msg, messageId, channel);
        }
      }
      return false;
    }
    return true;
  }

  /**
   * // TODO: now is static method Helper method to update the WitnessMessage of the lao with the
   * new witness signing
   *
   * @param messageId Base 64 URL encoded Id of the message to sign
   * @param senderPk  Base 64 URL encoded public key of the signer
   * @return false if there was a problem updating WitnessMessage
   */
  private static boolean updateWitnessMessage(Lao lao, String messageId, String senderPk) {

    Optional<WitnessMessage> optionalWitnessMessage = lao.getWitnessMessage(messageId);
    WitnessMessage witnessMessage;
    // We update the corresponding  witness message of the lao with a new witness that signed it.
    if (optionalWitnessMessage.isPresent()) {
      witnessMessage = optionalWitnessMessage.get();
      witnessMessage.addWitness(senderPk);
      Log.d(TAG, "We updated the WitnessMessage with a new witness " + messageId);
      lao.updateWitnessMessage(messageId, witnessMessage);
      Log.d(TAG, "We updated the Lao with the new WitnessMessage " + messageId);
    } else {
      Log.d(TAG, "Failed to retrieve the witness message in the lao with ID " + messageId);
      return false;
    }
    return true;
  }
}
