package ch.epfl.pop.pubsub.graph.validators

import akka.actor.{Actor, ActorRef, ActorSystem, Props}
import akka.pattern.AskableActorRef
import akka.testkit.{ImplicitSender, TestKit}
import akka.util.Timeout
import ch.epfl.pop.model.network.method.message.data.ObjectType
import ch.epfl.pop.model.objects._
import ch.epfl.pop.pubsub.graph.{GraphMessage, PipelineError}
import ch.epfl.pop.pubsub.{AskPatternConstants, MessageRegistry, PubSubMediator}
import ch.epfl.pop.storage.{DbActor, InMemoryStorage}
import org.scalatest.{BeforeAndAfterAll, FunSuiteLike, Matchers}
import util.examples.Election.CastVoteElectionExamples.{DATA_CAST_VOTE_MESSAGE, MESSAGE_CAST_VOTE_ELECTION_WORKING}
import util.examples.Election.EndElectionExamples.{DATA_END_ELECTION_MESSAGE, MESSAGE_END_ELECTION_WORKING}
import util.examples.Election.OpenElectionExamples.{DATA_OPEN_MESSAGE, MESSAGE_OPEN_ELECTION_WORKING}
import util.examples.Election.SetupElectionExamples
import util.examples.Election.SetupElectionExamples.{DATA_SET_UP_MESSAGE, MESSAGE_SETUPELECTION_WORKING}
import util.examples.JsonRpcRequestExample._
import util.examples.RollCall.CreateRollCallExamples.SENDER

import java.io.File
import java.util.concurrent.TimeUnit
import scala.reflect.io.Directory

class RollCallValidatorSuite extends TestKit(ActorSystem("electionValidatorTestActorSystem"))
  with FunSuiteLike
  with ImplicitSender
  with Matchers with BeforeAndAfterAll with AskPatternConstants {

  final val DB_TEST_FOLDER: String = "databaseRollCallTest"

  val pubSubMediatorRef: ActorRef = system.actorOf(PubSubMediator.props, "PubSubMediator")
  val dbActorRef: AskableActorRef = system.actorOf(Props(DbActor(pubSubMediatorRef, MessageRegistry(), InMemoryStorage())), "DbActor")

  // Implicit for system actors
  implicit val timeout: Timeout = Timeout(1, TimeUnit.SECONDS)

  override def afterAll(): Unit = {
    // Stops the testKit
    TestKit.shutdownActorSystem(system)

    // Deletes the test database
    val directory = new Directory(new File(DB_TEST_FOLDER))
    directory.deleteRecursively()
  }

  private final val sender: PublicKey = SENDER

  private final val PUBLIC_KEY: PublicKey = PublicKey(Base64Data("jsNj23IHALvppqV1xQfP71_3IyAHzivxiCz236_zzQc="))
  private final val PRIVATE_KEY: PrivateKey = PrivateKey(Base64Data("qRfms3wzSLkxAeBz6UtwA-L1qP0h8D9XI1FSvY68t7Y="))
  private final val PK_OWNER: PublicKey = PublicKey(Base64Data.encode("wrongOwner"))
  private final val laoDataRight: LaoData = LaoData(sender, List(sender), PRIVATE_KEY, PUBLIC_KEY, List.empty)
  private final val laoDataWrong: LaoData = LaoData(PK_OWNER, List(PK_OWNER), PRIVATE_KEY, PUBLIC_KEY, List.empty)
  private final val channelDataRight: ChannelData = ChannelData(ObjectType.LAO, List.empty)
  private final val channelDataWrong: ChannelData = ChannelData(ObjectType.ROLL_CALL, List.empty)

  private def mockDbWorking: AskableActorRef = {
    val dbActorMock = Props(new Actor() {
      override def receive: Receive = {
        case DbActor.ReadLaoData(_) =>
          sender() ! DbActor.DbActorReadLaoDataAck(laoDataRight)
        case DbActor.ReadChannelData(_) =>
          sender() ! DbActor.DbActorReadChannelDataAck(channelDataRight)
      }
    })
    system.actorOf(dbActorMock)
  }

  private def mockDbWrongToken: AskableActorRef = {
    val dbActorMock = Props(new Actor() {
      override def receive: Receive = {
        case DbActor.ReadLaoData(_) =>
          sender() ! DbActor.DbActorReadLaoDataAck(laoDataWrong)
        case DbActor.ReadChannelData(_) =>
          sender() ! DbActor.DbActorReadChannelDataAck(channelDataRight)
      }
    })
    system.actorOf(dbActorMock)
  }

  private def mockDbWrongChannel: AskableActorRef = {
    val dbActorMock = Props(new Actor() {
      override def receive: Receive = {
        case DbActor.ReadLaoData(_) =>
          sender() ! DbActor.DbActorReadLaoDataAck(laoDataRight)
        case DbActor.ReadChannelData(_) =>
          sender() ! DbActor.DbActorReadChannelDataAck(channelDataWrong)
      }
    })
    system.actorOf(dbActorMock)
  }

  //Create RollCall
  test("Create Roll Call works as intended") {
    val dbActorRef = mockDbWorking
    val message: GraphMessage = new RollCallValidator(dbActorRef).validateCreateRollCall(CREATE_ROLL_CALL_RPC)
    message should equal(Left(CREATE_ROLL_CALL_RPC))
    system.stop(dbActorRef.actorRef)
  }

  test("Create Roll Call should fail with invalid Timestamp") {
    val dbActorRef = mockDbWorking
    val message: GraphMessage = new RollCallValidator(dbActorRef).validateCreateRollCall(CREATE_ROLL_CALL_WRONG_TIMESTAMP_RPC)
    message shouldBe a[Right[_, PipelineError]]
    system.stop(dbActorRef.actorRef)
  }

  test("Create Roll Call should fail with invalid Timestamp order") {
    val dbActorRef = mockDbWorking
    val message: GraphMessage = new RollCallValidator(dbActorRef).validateCreateRollCall(CREATE_ROLL_CALL_WRONG_TIMESTAMP_ORDER_RPC)
    message shouldBe a[Right[_, PipelineError]]
    system.stop(dbActorRef.actorRef)
  }

  test("Create Roll Call should fail with invalid id") {
    val dbActorRef = mockDbWorking
    val message: GraphMessage = new RollCallValidator(dbActorRef).validateCreateRollCall(CREATE_ROLL_CALL_WRONG_ID_RPC)
    message shouldBe a[Right[_, PipelineError]]
    system.stop(dbActorRef.actorRef)
  }

  test("Create Roll Call should fail with wrong sender") {
    val dbActorRef = mockDbWorking
    val message: GraphMessage = new RollCallValidator(dbActorRef).validateCreateRollCall(CREATE_ROLL_CALL_WRONG_SENDER_RPC)
    message shouldBe a[Right[_, PipelineError]]
    system.stop(dbActorRef.actorRef)
  }

  test("Create Roll Call should fail with wrong type of channel") {
    val dbActorRef = mockDbWrongChannel
    val message: GraphMessage = new RollCallValidator(dbActorRef).validateCreateRollCall(CREATE_ROLL_CALL_RPC)
    message shouldBe a[Right[_, PipelineError]]
    system.stop(dbActorRef.actorRef)
  }

}
