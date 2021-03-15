package ch.epfl.pop.model.network.method.message.data.lao

import ch.epfl.pop.model.network.Parsable
import ch.epfl.pop.model.network.method.message.data.ActionType.ActionType
import ch.epfl.pop.model.network.method.message.data.ObjectType.ObjectType
import ch.epfl.pop.model.network.method.message.data.{ActionType, MessageData, ObjectType}
import ch.epfl.pop.model.objects.{Hash, PublicKey, Timestamp}

case class CreateLao(
                      id: Hash,
                      name: String,
                      creation: Timestamp,
                      organizer: PublicKey,
                      witnesses: List[PublicKey]
                    ) extends MessageData {
  override val _object: ObjectType = ObjectType.LAO
  override val action: ActionType = ActionType.CREATE
}

object CreateLao extends Parsable {
  def apply(id: Hash, name: String, creation: Timestamp, organizer: PublicKey, witnesses: List[PublicKey]): CreateLao = {
    // FIXME add checks
    new CreateLao(id, name, creation, organizer, witnesses)
  }

  override def buildFromJson(messageData: MessageData, payload: String): CreateLao = ???
}
