package ch.epfl.pop.pubsub.graph.handlers

import akka.pattern.AskableActorRef
import ch.epfl.pop.json.MessageDataProtocol.resultElectionFormat
import ch.epfl.pop.model.network.JsonRpcRequest
import ch.epfl.pop.model.network.method.message.Message
import ch.epfl.pop.model.network.method.message.data.ObjectType
import ch.epfl.pop.model.network.method.message.data.election._
import ch.epfl.pop.model.objects._
import ch.epfl.pop.pubsub.graph.{ErrorCodes, GraphMessage, PipelineError}
import ch.epfl.pop.storage.DbActor

import scala.collection.mutable
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.{Await, Future}
import scala.util.{Failure, Success}
import ch.epfl.pop.model.objects.ElectionChannel.ElectionChannel
import ch.epfl.pop.storage.DbActor.DbActorReadLaoDataAck

/**
 * ElectionHandler object uses the db instance from the MessageHandler
 */
object ElectionHandler extends MessageHandler {
  final lazy val handlerInstance = new ElectionHandler(super.dbActor)

  def handleSetupElection(rpcMessage: JsonRpcRequest): GraphMessage = handlerInstance.handleSetupElection(rpcMessage)

  def handleOpenElection(rpcMessage: JsonRpcRequest): GraphMessage = handlerInstance.handleOpenElection(rpcMessage)

  def handleCastVoteElection(rpcMessage: JsonRpcRequest): GraphMessage = handlerInstance.handleCastVoteElection(rpcMessage)

  def handleResultElection(rpcMessage: JsonRpcRequest): GraphMessage = handlerInstance.handleResultElection(rpcMessage)

  def handleEndElection(rpcMessage: JsonRpcRequest): GraphMessage = handlerInstance.handleEndElection(rpcMessage)
}

class ElectionHandler(dbRef: => AskableActorRef) extends MessageHandler {

  /**
   *
   * Overrides default DbActor with provided parameter
   */
  override final val dbActor: AskableActorRef = dbRef

  def handleSetupElection(rpcMessage: JsonRpcRequest): GraphMessage = {
    val message: Message = rpcMessage.getParamsMessage.get
    val electionId: Hash = message.decodedData.get.asInstanceOf[SetupElection].id
    val electionChannel: Channel = Channel(s"${rpcMessage.getParamsChannel.channel}${Channel.CHANNEL_SEPARATOR}$electionId")

    //need to write and propagate the election message
    val combined = for {
      _ <- dbActor ? DbActor.WriteAndPropagate(rpcMessage.getParamsChannel, message)
      _ <- dbActor ? DbActor.CreateChannel(electionChannel, ObjectType.ELECTION)
      _ <- dbActor ? DbActor.WriteAndPropagate(electionChannel, message)
    } yield ()

    Await.ready(combined, duration).value match {
      case Some(Success(_)) => Left(rpcMessage)
      case Some(Failure(ex: DbActorNAckException)) => Right(PipelineError(ex.code, s"handleSetupElection failed : ${ex.message}", rpcMessage.getId))
      case reply => Right(PipelineError(ErrorCodes.SERVER_ERROR.id, s"handleSetupElection failed : unexpected DbActor reply '$reply'", rpcMessage.getId))
    }
  }

  def handleOpenElection(rpcMessage: JsonRpcRequest): GraphMessage = {
    //checks first if the election is created (i.e. if the channel election exists)
    val askChannelExist = dbActor ? DbActor.ChannelExists(rpcMessage.getParamsChannel)
    Await.ready(askChannelExist, duration).value.get match {
      case Success(_) =>
        val askWritePropagate: Future[GraphMessage] = dbAskWritePropagate(rpcMessage)
        Await.result(askWritePropagate, duration)
      case Failure(ex: DbActorNAckException) => Right(PipelineError(ex.code, s"handleOpenElection failed : ${ex.message}", rpcMessage.getId))
      case reply => Right(PipelineError(ErrorCodes.SERVER_ERROR.id, s"handleOpenElection failed : unknown DbActor reply $reply", rpcMessage.getId))
    }
  }

  def handleCastVoteElection(rpcMessage: JsonRpcRequest): GraphMessage = {
    // no need to propagate here, hence the use of dbAskWrite
    val ask: Future[GraphMessage] = dbAskWritePropagate(rpcMessage)
    Await.result(ask, duration)
  }

  def handleResultElection(rpcMessage: JsonRpcRequest): GraphMessage = Right(
    PipelineError(ErrorCodes.SERVER_ERROR.id, "NOT IMPLEMENTED: ElectionHandler cannot handle ResultElection messages yet", rpcMessage.id)
  )

  def handleEndElection(rpcMessage: JsonRpcRequest): GraphMessage = {
    val witnessSignatures = rpcMessage.getParamsMessage match {
      case Some(it) => it.witness_signatures.map(_.signature)
      case _ => Nil
    }
    val electionChannel: Channel = rpcMessage.getParamsChannel
    val combined = for {
      electionQuestionResults <- createElectionQuestionResults(electionChannel)
      resultElection: ResultElection = ResultElection(electionQuestionResults, witnessSignatures)
      // propagate the endElection message
      _ <- dbAskWritePropagate(rpcMessage)
      // read laoData
      DbActorReadLaoDataAck(laoData) <- dbActor ? DbActor.ReadLaoData(rpcMessage.getParamsChannel)
      // create & propagate the resultMessage
      resultMessage: Message = createResultMessage(resultElection, laoData /*, witnessSignatures*/)
      _ <- dbActor ? DbActor.WriteAndPropagate(electionChannel, resultMessage)
    } yield ()
    Await.ready(combined, duration).value match {
      case Some(Success(_)) =>
        Left(rpcMessage)
      case _ =>
        Right(PipelineError(ErrorCodes.SERVER_ERROR.id, s"handleEndElection unknown error", rpcMessage.getId))
    }
  }

  private def createResultMessage(resultElection: ResultElection, laoData: LaoData,
                                  witnessSignatures: List[WitnessSignaturePair] = Nil): Message = {
    val resultElectionB64: Base64Data = Base64Data.encode(resultElectionFormat.write(resultElection).toString())
    val signature: Signature = laoData.privateKey.signData(resultElectionB64)
    val sender: PublicKey = laoData.publicKey
    val messageId: Hash = Hash.fromStrings(resultElectionB64.toString, signature.toString)
    Message(resultElectionB64, sender, signature, messageId, witnessSignatures, Some(resultElection))
  }

  private def createElectionQuestionResults(electionChannel: Channel): Future[List[ElectionQuestionResult]] = {
    for {
      votesList <- electionChannel.getLastVotes(dbActor)
      castsVotesElections = votesList.map(_._2)
      setupMessage <- electionChannel.getSetupMessage(dbActor)
      questionToBallots = setupMessage.questions.map(question => question.id -> question.ballot_options).toMap
      resultsTable = mutable.HashMap.from(for {
        (question, ballots) <- questionToBallots
      } yield question -> ballots.map(_ -> 0).toMap)
      castVoteElection <- Future.traverse(castsVotesElections) { castVoteElection => {
        for {
          voteElection <- castVoteElection.votes
          _ = voteElection.vote match {
            case Some(List(index)) =>
              val question = voteElection.question
              val ballots = questionToBallots(question).toArray
              val ballot = ballots.apply(index)
              val questionResult = resultsTable(question)
              resultsTable.update(question, questionResult.updated(ballot, questionResult(ballot) + 1))
            case _ =>
          }
        } {}
        Future(Success(()))
      }
      }
      results = resultsTable.map(tuple => {
        val (qid, ballotToCount) = tuple
        // build ElectionBallotVotes objects
        val electionBallotVotes = ballotToCount.map(tuple => ElectionBallotVotes(tuple._1, tuple._2))
        ElectionQuestionResult(qid, electionBallotVotes.toList)
      })
    } yield results.toList
  }
}


/*
* val question = voteElection.question
      voteElection.vote match {
        case Some(List(index)) =>
          val ballots = questionToBallots(question).toArray
          val ballot = ballots.apply(index)
          val questionResult = resultsTable(question)
          resultsTable.update(question, questionResult.updated(ballot, questionResult(ballot) + 1))
        case _ =>
      }
      val results = resultsTable.map(tuple => {
        val (qid, ballotToCount) = tuple
        // build ElectionBallotVotes objects
        val electionBallotVotes = ballotToCount.map(tuple => ElectionBallotVotes(tuple._1, tuple._2))
        ElectionQuestionResult(qid, electionBallotVotes.toList)
      })*/
