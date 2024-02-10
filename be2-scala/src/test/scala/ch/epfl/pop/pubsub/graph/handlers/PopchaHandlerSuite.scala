package ch.epfl.pop.pubsub.graph.handlers

import akka.actor.{Actor, ActorSystem, Props}
import akka.http.scaladsl.model.Uri
import akka.pattern.AskableActorRef
import akka.testkit.TestKit
import akka.util.Timeout
import ch.epfl.pop.config.RuntimeEnvironment
import ch.epfl.pop.model.network.JsonRpcMessage
import ch.epfl.pop.model.objects.{Base64Data, PublicKey}
import ch.epfl.pop.pubsub.AskPatternConstants
import ch.epfl.pop.pubsub.graph.{GraphMessage, PipelineError}
import ch.epfl.pop.storage.SecurityModuleActor.{ReadRsaPublicKey, ReadRsaPublicKeyAck}
import ch.epfl.pop.storage.SecurityModuleActorSuite.testSecurityDirectory
import ch.epfl.pop.storage.{DbActor, SecurityModuleActor}
import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import org.scalatest.BeforeAndAfterAll
import org.scalatest.Inside.inside
import org.scalatest.funsuite.AnyFunSuiteLike
import org.scalatest.matchers.should.Matchers
import util.examples.JsonRpcRequestExample.AUTHENTICATE_RPC
import util.examples.MessageExample
import util.examples.MessageExample.{MESSAGE_AUTHENTICATE, VALID_AUTHENTICATE}

import java.io.File
import java.util.concurrent.TimeUnit
import scala.annotation.unused
import scala.concurrent.{Await, Promise}
import scala.jdk.CollectionConverters.MapHasAsScala
import scala.reflect.io.Directory
import scala.util.{Success, Try}

class PopchaHandlerSuite extends TestKit(ActorSystem("popchaHandlerTestActorSystem")) with AnyFunSuiteLike
    with Matchers with BeforeAndAfterAll with AskPatternConstants {

  final val DB_TEST_FOLDER: String = "databasePopchaTest"

  // Implicit for system actors
  implicit val timeout: Timeout = Timeout(1, TimeUnit.SECONDS)

  private val serverError = PipelineError(42, "Some server error", Some(42))
  private val otherUser = PublicKey(MessageExample.SEED)

  override def afterAll(): Unit = {
    // Stops the testKit
    TestKit.shutdownActorSystem(system)

    // Deletes the test database
    val directory = new Directory(new File(DB_TEST_FOLDER))
    directory.deleteRecursively()
  }

  private def setupMockDB(authenticateUserWith: Option[PublicKey])(authPromise: Option[Promise[(PublicKey, String, PublicKey)]]): AskableActorRef = {
    val dbActorMock = Props(new Actor() {
      override def receive: Receive = {
        case DbActor.ReadUserAuthenticated(_, _) =>
          sender() ! DbActor.DbActorReadUserAuthenticationAck(authenticateUserWith)
        case DbActor.WriteUserAuthenticated(popToken: PublicKey, clientId: String, user: PublicKey) =>
          if (authPromise.isDefined) {
            authPromise.get.success((popToken, clientId, user))
          }
          sender() ! DbActor.DbActorAck()
      }
    })
    system.actorOf(dbActorMock)
  }

  def handleAuthenticationResponse(rpcMessage: JsonRpcMessage, promise: Promise[Uri])(response: Uri): GraphMessage = {
    promise.success(response)
    Right(rpcMessage)
  }

  def failToHandleAuthenticationResponse(@unused response: Uri): GraphMessage = {
    Left(serverError)
  }

  def dummyResponseHandler(rpcMessage: JsonRpcMessage)(@unused response: Uri): GraphMessage = {
    Right(rpcMessage)
  }

  private val mockDbWithoutUser = setupMockDB(None) _
  private val mockDbWithValidUser = setupMockDB(Some(VALID_AUTHENTICATE.identifier)) _
  private val mockDbWithInvalidUser = setupMockDB(Some(otherUser)) _

  test("Authentication handler sends correct id token") {
    val laoId = Base64Data.encode("laoid").toString

    val respPromise = Promise[Uri]()

    val dbActorRef = mockDbWithoutUser(None)
    val securityModuleActorRef: AskableActorRef = system.actorOf(Props(SecurityModuleActor(testSecurityDirectory)))
    val responseHandler: Uri => GraphMessage = handleAuthenticationResponse(AUTHENTICATE_RPC, respPromise)

    val publicKeyAsk = Await.result(securityModuleActorRef ? ReadRsaPublicKey(), duration)
    val serverPublicKey = publicKeyAsk.asInstanceOf[ReadRsaPublicKeyAck].publicKey

    val message = new PopchaHandler(dbActorRef, securityModuleActorRef).handleAuthentication(AUTHENTICATE_RPC, responseHandler)
    message shouldBe Right(AUTHENTICATE_RPC)

    val result = Await.ready(respPromise.future, timeout.duration).value
    result should matchPattern { case Some(Success(_)) => }

    val responseUri = result.get.get
    val responseParams = responseUri.query(mode = Uri.ParsingMode.Relaxed).toMap

    responseParams should contain("token_type" -> "bearer")
    responseParams should contain("expires_in" -> "3600")
    responseParams should contain("state" -> VALID_AUTHENTICATE.state)
    responseParams should contain key "id_token"

    val idToken = JWT.require(Algorithm.RSA256(serverPublicKey))
      .build()
      .verify(responseParams("id_token"))

    val claims = idToken.getClaims.asScala.map(kv => kv._1 -> kv._2.toString.stripPrefix("\"").stripSuffix("\""))

    claims should contain("iss" -> RuntimeEnvironment.ownRootPath)
    claims should contain("sub" -> VALID_AUTHENTICATE.identifier.base64Data.toString())
    claims should contain("aud" -> VALID_AUTHENTICATE.clientId)
    claims should contain("nonce" -> VALID_AUTHENTICATE.nonce.decodeToString())
    claims should contain("laoId" -> laoId)

    claims should contain key "exp"
    claims should contain key "iat"
    claims should contain key "auth_time"
  }

  test("Authentication writes authentication information on first authentication") {
    val authPromise = Promise[(PublicKey, String, PublicKey)]()

    val dbActorRef = mockDbWithoutUser(Some(authPromise))
    val securityModuleActorRef = system.actorOf(Props(SecurityModuleActor(testSecurityDirectory)))
    val message = new PopchaHandler(dbActorRef, securityModuleActorRef).handleAuthentication(AUTHENTICATE_RPC, dummyResponseHandler(AUTHENTICATE_RPC))
    message shouldBe Right(AUTHENTICATE_RPC)

    val authInfo = Await.ready(authPromise.future, timeout.duration).value
    authInfo should matchPattern { case Some(Success(_)) => }

    val (popToken, clientId, identifier) = authInfo.get.get

    popToken should equal(MESSAGE_AUTHENTICATE.sender)
    clientId should equal(VALID_AUTHENTICATE.clientId)
    identifier should equal(VALID_AUTHENTICATE.identifier)
  }

  test("Authentication should not write authentication information on second authentication") {
    val authPromise = Promise[(PublicKey, String, PublicKey)]()

    val dbActorRef = mockDbWithValidUser(Some(authPromise))
    val securityModuleActorRef = system.actorOf(Props(SecurityModuleActor(testSecurityDirectory)))
    val message = new PopchaHandler(dbActorRef, securityModuleActorRef).handleAuthentication(AUTHENTICATE_RPC, dummyResponseHandler(AUTHENTICATE_RPC))
    message shouldBe Right(AUTHENTICATE_RPC)

    val authInfo = Try(Await.ready(authPromise.future, timeout.duration))
    authInfo shouldBe Symbol("isFailure")
  }

  test("Authentication should fail on second authentication with a different identifier") {
    val dbActorRef = mockDbWithInvalidUser(None)
    val securityModuleActorRef = system.actorOf(Props(SecurityModuleActor(testSecurityDirectory)))
    val message = new PopchaHandler(dbActorRef, securityModuleActorRef).handleAuthentication(AUTHENTICATE_RPC, dummyResponseHandler(AUTHENTICATE_RPC))
    message shouldBe a[Left[_, _]]
  }

  test("Failure to send the authentication response should return the failure cause") {
    val dbActorRef = mockDbWithoutUser(None)
    val securityModuleActorRef = system.actorOf(Props(SecurityModuleActor(testSecurityDirectory)))
    val message = new PopchaHandler(dbActorRef, securityModuleActorRef).handleAuthentication(AUTHENTICATE_RPC, failToHandleAuthenticationResponse)
    inside(message) {
      case Left(error) => error shouldEqual serverError
    }
  }
}
