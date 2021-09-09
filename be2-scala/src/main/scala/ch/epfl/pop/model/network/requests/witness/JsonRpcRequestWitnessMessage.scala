package ch.epfl.pop.model.network.requests.witness

import ch.epfl.pop.model.network.method.Params
import ch.epfl.pop.model.network.{JsonRpcRequest, MethodType}

final case class JsonRpcRequestWitnessMessage(
                                               override val jsonrpc: String,
                                               override val method: MethodType.MethodType,
                                               override val params: Params,
                                               override val id: Option[Int]
                                             ) extends JsonRpcRequest(jsonrpc, method, params, id)
