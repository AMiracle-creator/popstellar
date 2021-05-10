package ch.epfl.pop.model.network.requests.rollCall

import ch.epfl.pop.model.network.{JsonRpcRequest, MethodType}
import ch.epfl.pop.model.network.method.Params

final case class JsonRpcRequestCloseRollCall(
                                              override val jsonrpc: String,
                                              override val method: MethodType.MethodType,
                                              override val params: Params,
                                              override val id: Option[Int]
                                            ) extends JsonRpcRequest(jsonrpc, method, params, id)
