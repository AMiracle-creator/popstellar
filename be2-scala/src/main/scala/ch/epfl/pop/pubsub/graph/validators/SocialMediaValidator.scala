package ch.epfl.pop.pubsub.graph.validators

import akka.pattern.AskableActorRef
import ch.epfl.pop.model.network.JsonRpcRequest
import ch.epfl.pop.model.network.method.message.data.ObjectType
import ch.epfl.pop.model.network.method.message.data.socialMedia._
import ch.epfl.pop.model.objects.Channel
import ch.epfl.pop.pubsub.graph.validators.MessageValidator._
import ch.epfl.pop.pubsub.graph.{GraphMessage, PipelineError}
import ch.epfl.pop.storage.DbActor

// Similarly to the handlers, we create a SocialMediaValidator object which creates a SocialMediaValidator class instance.
// The default dbActorRef is used in the object, but the class can now be mocked with a custom dbActorRef for testing purposes.
object SocialMediaValidator extends MessageDataContentValidator with EventValidator {

  val socialMediaValidator = new SocialMediaValidator(DbActor.getInstance)

  override val EVENT_HASH_PREFIX: String = socialMediaValidator.EVENT_HASH_PREFIX

  def validateAddChirp(rpcMessage: JsonRpcRequest): GraphMessage = socialMediaValidator.validateAddChirp(rpcMessage)

  def validateNotifyAddChirp(rpcMessage: JsonRpcRequest): GraphMessage = socialMediaValidator.validateNotifyAddChirp(rpcMessage)

  def validateAddReaction(rpcMessage: JsonRpcRequest): GraphMessage = socialMediaValidator.validateAddReaction(rpcMessage)

  def validateDeleteReaction(rpcMessage: JsonRpcRequest): GraphMessage = socialMediaValidator.validateDeleteReaction(rpcMessage)

  def validateDeleteChirp(rpcMessage: JsonRpcRequest): GraphMessage = socialMediaValidator.validateDeleteChirp(rpcMessage)

  def validateNotifyDeleteChirp(rpcMessage: JsonRpcRequest): GraphMessage = socialMediaValidator.validateNotifyDeleteChirp(rpcMessage)
}

sealed class SocialMediaValidator(dbActorRef: => AskableActorRef) extends MessageDataContentValidator with EventValidator {

  override val EVENT_HASH_PREFIX: String = s"${Channel.CHANNEL_SEPARATOR}posts"

  private val MAX_CHIRP_TEXT_SIZE_REGEX = ".{0,300}$".r

  def validateAddChirp(rpcMessage: JsonRpcRequest): GraphMessage = {
    def validationError(reason: String): PipelineError = super.validationError(reason, "AddChirp", rpcMessage.id)

    rpcMessage.getParamsMessage match {

      case Some(message) =>
        val (addChirp, _, senderPK, channel) = extractData[AddChirp](rpcMessage)

        runChecks(
          checkTimestampStaleness(
            rpcMessage,
            addChirp.timestamp,
            validationError(s"stale timestamp (${addChirp.timestamp})")
          ),
          checkChannelType(
            rpcMessage,
            ObjectType.CHIRP,
            channel,
            dbActorRef,
            validationError(s"trying to add a Chirp on a wrong type of channel $channel")
          ),
          checkAttendee(
            rpcMessage,
            senderPK,
            channel,
            dbActorRef,
            validationError(s"Sender $senderPK has an invalid PoP token.")
          ),
          checkBase64Equality(
            rpcMessage,
            channel.extractChildChannel.base64Data,
            senderPK.base64Data,
            validationError(s"Sender $senderPK has an invalid PoP token - doesn't own the channel.")
          ),
          checkStringPattern(
            rpcMessage,
            addChirp.text,
            MAX_CHIRP_TEXT_SIZE_REGEX,
            validationError(s"Text is too long (over 300 characters).")
          ),
          checkIdExistence(
            rpcMessage,
            addChirp.parent_id,
            channel,
            dbActorRef,
            validationError(s"Parent chirp id doesn't exist")
          )
        )
      case _ => Right(validationErrorNoMessage(rpcMessage.id))
    }
  }

  // no need for validation for now, as the server is not supposed to receive the broadcasts
  def validateNotifyAddChirp(rpcMessage: JsonRpcRequest): GraphMessage = {
    Left(rpcMessage)
  }

  def validateDeleteChirp(rpcMessage: JsonRpcRequest): GraphMessage = {
    def validationError(reason: String): PipelineError = super.validationError(reason, "DeleteChirp", rpcMessage.id)

    rpcMessage.getParamsMessage match {

      // TODO need more checks
      case Some(message) =>
        val data: DeleteChirp = message.decodedData.get.asInstanceOf[DeleteChirp]

        val sender: PublicKey = message.sender // sender's PK
        val channel: Channel = rpcMessage.getParamsChannel

        if (!validateTimestampStaleness(data.timestamp)) {
          Right(validationError(s"stale timestamp (${data.timestamp})"))
        } else if (!validateChannelType(ObjectType.CHIRP, channel, dbActorRef)) {
          Right(validationError(s"trying to delete a Chirp on a wrong type of channel $channel"))
        } else if (!validateAttendee(sender, channel, dbActorRef)) {
          Right(validationError(s"Sender $sender has an invalid PoP token."))
        } else if (channel.extractChildChannel.base64Data != sender.base64Data) {
          Right(validationError(s"Sender $sender has an invalid PoP token - doesn't own the channel."))
        } else {
          Left(rpcMessage)
        }
      case _ => Right(validationErrorNoMessage(rpcMessage.id))
    }
  }

  // no need for validation for now, as the server is not supposed to receive the broadcasts
  def validateNotifyDeleteChirp(rpcMessage: JsonRpcRequest): GraphMessage = {
    Left(rpcMessage)
  }

  def validateAddReaction(rpcMessage: JsonRpcRequest): GraphMessage = {
    def validationError(reason: String): PipelineError = super.validationError(reason, "AddReaction", rpcMessage.id)

    rpcMessage.getParamsMessage match {

      case Some(message) =>
        val data: AddReaction = message.decodedData.get.asInstanceOf[AddReaction]
        val sender: PublicKey = message.sender // sender's PK
        val channel: Channel = rpcMessage.getParamsChannel

        if (!validateTimestampStaleness(data.timestamp)) {
          Right(validationError(s"stale timestamp (${data.timestamp})"))
        } else if (!validateChannelType(ObjectType.REACTION, channel, dbActorRef)) {
          Right(validationError(s"trying to delete a reaction on a wrong type of channel $channel"))
        } else if (!validateAttendee(sender, channel, dbActorRef)) {
          Right(validationError(s"Sender $sender has an invalid PoP token."))
        } else {
          Left(rpcMessage)
        }
      case _ => Right(validationErrorNoMessage(rpcMessage.id))
    }
  }

  def validateDeleteReaction(rpcMessage: JsonRpcRequest): GraphMessage = {
    def validationError(reason: String): PipelineError = super.validationError(reason, "DeleteReaction", rpcMessage.id)

    rpcMessage.getParamsMessage match {

      case Some(message) =>
        val data: DeleteReaction = message.decodedData.get.asInstanceOf[DeleteReaction]
        val sender: PublicKey = message.sender // sender's PK
        val channel: Channel = rpcMessage.getParamsChannel

        if (!validateTimestampStaleness(data.timestamp)) {
          Right(validationError(s"stale timestamp (${data.timestamp})"))
        } else if (!validateChannelType(ObjectType.REACTION, channel, dbActorRef)) {
          Right(validationError(s"trying to delete a reaction on a wrong type of channel $channel"))
        } else if (!validateAttendee(sender, channel, dbActorRef)) {
          Right(validationError(s"Sender $sender has an invalid PoP token."))
        } else {
          Left(rpcMessage)
        }
      case _ => Right(validationErrorNoMessage(rpcMessage.id))
    }
  }
}
