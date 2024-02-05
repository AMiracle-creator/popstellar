package ch.epfl.pop.pubsub.graph.validators

import akka.actor.{Actor, ActorSystem, Props}
import akka.pattern.AskableActorRef
import akka.testkit.TestKit
import akka.util.Timeout
import ch.epfl.pop.model.network.method.message.data.ObjectType
import ch.epfl.pop.model.objects.{ChannelData, LaoData, PrivateKey, PublicKey}
import ch.epfl.pop.pubsub.AskPatternConstants
import ch.epfl.pop.pubsub.graph.{GraphMessage, PipelineError}
import ch.epfl.pop.storage.DbActor
import org.scalatest.BeforeAndAfterAll
import org.scalatest.funsuite.{AnyFunSuiteLike => FunSuiteLike}
import org.scalatest.matchers.should.Matchers
import util.examples.JsonRpcRequestExample._
import util.examples.MessageExample

import java.io.File
import java.util.concurrent.TimeUnit
import scala.reflect.io.Directory

class PopchaValidatorSuite extends TestKit(ActorSystem("popChaValidatorTestActorSystem")) with FunSuiteLike
    with Matchers with BeforeAndAfterAll with AskPatternConstants {

  final val DB_TEST_FOLDER: String = "databasePopchaTest"

  // Implicit for system actors
  implicit val timeout: Timeout = Timeout(1, TimeUnit.SECONDS)

  private val userIdentifier = MessageExample.PUBLIC_KEY
  private val otherUser = PublicKey(MessageExample.SEED)
  private val laoSeed = MessageExample.SEED
  private final val ADDRESS: String = "127.0.0.1:8000"

  private val laoDataWithUser = LaoData(userIdentifier, List(userIdentifier), PrivateKey(laoSeed), PublicKey(laoSeed), List(), ADDRESS)
  private val laoDataWithoutUser = LaoData(otherUser, List(otherUser), PrivateKey(laoSeed), PublicKey(laoSeed), List(), ADDRESS)

  private val channelDataWithValidObjectType = ChannelData(ObjectType.POPCHA, Nil)
  private val channelDataWithInvalidObjectType = ChannelData(ObjectType.COIN, Nil)

  override def afterAll(): Unit = {
    // Stops the testKit
    TestKit.shutdownActorSystem(system)

    // Deletes the test database
    val directory = new Directory(new File(DB_TEST_FOLDER))
    directory.deleteRecursively()
  }

  private def setupMockDB(laoData: LaoData, channelData: ChannelData, authenticateUserWith: Option[PublicKey] = None): AskableActorRef = {
    val dbActorMock = Props(new Actor() {
      override def receive: Receive = {
        case DbActor.ReadLaoData(_)              => sender() ! DbActor.DbActorReadLaoDataAck(laoData)
        case DbActor.ReadChannelData(_)          => sender() ! DbActor.DbActorReadChannelDataAck(channelData)
        case DbActor.ReadUserAuthenticated(_, _) => sender() ! DbActor.DbActorReadUserAuthenticationAck(authenticateUserWith)
      }
    })
    system.actorOf(dbActorMock)
  }

  private val mockDBWithUser: AskableActorRef = setupMockDB(laoDataWithUser, channelDataWithValidObjectType)
  private val mockDBWithoutUser: AskableActorRef = setupMockDB(laoDataWithoutUser, channelDataWithValidObjectType)
  private val mockDBWithInvalidChannelType: AskableActorRef = setupMockDB(laoDataWithUser, channelDataWithInvalidObjectType)

  private val mockDBWithSameUserAuthenticated: AskableActorRef = setupMockDB(laoDataWithUser, channelDataWithValidObjectType, Some(userIdentifier))
  private val mockDBWithOtherUserAuthenticated: AskableActorRef = setupMockDB(laoDataWithUser, channelDataWithValidObjectType, Some(otherUser))

  test("Authenticate works without user already authenticated") {
    val dbActorRef = mockDBWithUser
    val message: GraphMessage = new PopchaValidator(dbActorRef).validateAuthenticateRequest(AUTHENTICATE_RPC)
    message should equal(Right(AUTHENTICATE_RPC))
  }

  test("Authenticate works with other response mode") {
    val dbActorRef = mockDBWithUser
    val message: GraphMessage = new PopchaValidator(dbActorRef).validateAuthenticateRequest(AUTHENTICATE_OTHER_RESPONSE_MODE_RPC)
    message should equal(Right(AUTHENTICATE_OTHER_RESPONSE_MODE_RPC))
  }

  test("Authenticate with wrong channel type fails") {
    val dbActorRef = mockDBWithInvalidChannelType
    val message: GraphMessage = new PopchaValidator(dbActorRef).validateAuthenticateRequest(AUTHENTICATE_RPC)
    message shouldBe a[Left[_, PipelineError]]
  }

  test("Authenticate with wrong signature fails") {
    val dbActorRef = mockDBWithUser
    val message: GraphMessage = new PopchaValidator(dbActorRef).validateAuthenticateRequest(AUTHENTICATE_INVALID_SIGNATURE_RPC)
    message shouldBe a[Left[_, PipelineError]]
  }

  test("Authenticate with wrong response mode fails") {
    val dbActorRef = mockDBWithUser
    val message: GraphMessage = new PopchaValidator(dbActorRef).validateAuthenticateRequest(AUTHENTICATE_INVALID_RESPONSE_MODE_RPC)
    message shouldBe a[Left[_, PipelineError]]
  }

  test("Authenticate with user not in last lao's rollcall fails") {
    val dbActorRef = mockDBWithoutUser
    val message: GraphMessage = new PopchaValidator(dbActorRef).validateAuthenticateRequest(AUTHENTICATE_RPC)
    message shouldBe a[Left[_, PipelineError]]
  }

  test("Authenticate with other pop token already registered fails") {
    val dbActorRef = mockDBWithOtherUserAuthenticated
    val message: GraphMessage = new PopchaValidator(dbActorRef).validateAuthenticateRequest(AUTHENTICATE_RPC)
    message shouldBe a[Left[_, PipelineError]]
  }

  test("Authenticate with same pop token already registered succeeds") {
    val dbActorRef = mockDBWithSameUserAuthenticated
    val message: GraphMessage = new PopchaValidator(dbActorRef).validateAuthenticateRequest(AUTHENTICATE_RPC)
    message should equal(Right(AUTHENTICATE_RPC))
  }
}
