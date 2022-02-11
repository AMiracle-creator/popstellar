package ch.epfl.pop.pubsub

import ch.epfl.pop.model.network.method.ParamsWithMessage
import ch.epfl.pop.model.network.{JsonRpcRequest, MethodType}
import ch.epfl.pop.model.network.method.message.data.ActionType.ActionType
import ch.epfl.pop.model.network.method.message.data.ObjectType.ObjectType
import ch.epfl.pop.model.network.method.message.data.lao.{CreateLao, StateLao}
import ch.epfl.pop.model.network.method.message.data.rollCall.CreateRollCall
import ch.epfl.pop.model.network.method.message.data.{ActionType, MessageData, ObjectType}
import ch.epfl.pop.pubsub.MessageRegistry.RegisterEntry
import ch.epfl.pop.pubsub.graph.{GraphMessage, MessageDecoder}
import org.scalatest.{FunSuite, Matchers}
import util.examples.JsonRpcRequestExample

class MessageRegistrySuite extends FunSuite with Matchers {

  case class MessageDataInstance() extends MessageData {
    override val _object: ObjectType = ObjectType.INVALID
    override val action: ActionType = ActionType.INVALID
  }

  def unitBuilder(s: String): MessageData = MessageDataInstance()
  def unitValidator(r: JsonRpcRequest): GraphMessage = Left(r)
  def unitHandler(r: JsonRpcRequest): GraphMessage = unitValidator(r)

  val register: Map[(ObjectType, ActionType), RegisterEntry] = Map(
    (ObjectType.LAO, ActionType.CREATE) -> RegisterEntry(unitBuilder, unitValidator, unitHandler),
    (ObjectType.ROLL_CALL, ActionType.CREATE) -> RegisterEntry(CreateRollCall.buildFromJson, unitValidator, unitHandler),
    (ObjectType.ROLL_CALL, ActionType.CAST_VOTE) -> RegisterEntry(unitBuilder, unitValidator, unitHandler), // combination does not exist
  )
  val registry: MessageRegistry = new MessageRegistry(register)

  test("A custom MessageRegistry may be injected in the graph") {
    //var gm = Left(JsonRpcRequestExample.CREATE_LAO_RPC)

    val gm = Left(JsonRpcRequest.buildFromJson("""{"jsonrpc":"2.0","method":"publish","params":{"message":{"message_id":"f1jTxH8TU2UGUBnikGU3wRTHjhOmIEQVmxZBK55QpsE=","sender":"to_klZLtiHV446Fv98OLNdNmi-EP5OaTtbBkotTYLic=","signature":"2VDJCWg11eNPUvZOnvq5YhqqIKLBcik45n-6o87aUKefmiywagivzD4o_YmjWHzYcb9qg-OgDBZbBNWSUgJICA==","data":"eyJjcmVhdGlvbiI6MTYzMTg4NzQ5NiwiaWQiOiJ4aWdzV0ZlUG1veGxkd2txMUt1b0wzT1ZhODl4amdYalRPZEJnSldjR1drPSIsIm5hbWUiOiJoZ2dnZ2dnIiwib3JnYW5pemVyIjoidG9fa2xaTHRpSFY0NDZGdjk4T0xOZE5taS1FUDVPYVR0YkJrb3RUWUxpYz0iLCJ3aXRuZXNzZXMiOltdLCJvYmplY3QiOiJsYW8iLCJhY3Rpb24iOiJjcmVhdGUifQ==","witness_signatures":[]},"channel":"/root"},"id":1}"""))

    val res = MessageDecoder.parseData(gm, registry)
    print(res)
/*
    res shouldBe a[GraphMessage]
    res.isLeft should be (true)

    res match {
      case Left(rpcMessage) =>
        rpcMessage shouldBe a[JsonRpcRequest]

        // takes the "left" of the either
        val rpc = rpcMessage.asInstanceOf[JsonRpcRequest]
        rpc.getDecodedData.isDefined should be (true)

        //print(JsonRpcRequestExample.CREATE_LAO_RPC.params)
        //print(rpc.params.asInstanceOf[ParamsWithMessage].message)

        val messageData = rpc.getDecodedData.get
        messageData._object should equal (MessageDataInstance()._object)
        messageData.action should equal (MessageDataInstance().action)
      case _ => fail("resulting graph message is not 'Left'")
    }

*/
    // Modified lao state builder

    // Original roll call create builder

    // New header combination

    // New header combination (not in the custom registry)

    // Existing combination (not in the custom registry)
  }
}
