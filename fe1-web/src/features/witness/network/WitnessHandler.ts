import { ExtendedMessage } from 'core/network/messages';
import { ActionType, MessageRegistry, ObjectType } from 'core/network/messages';
import { addMessageWitnessSignature, dispatch, getStore } from 'store';
import { makeCurrentLao } from 'features/lao/reducer';

import { WitnessSignature } from '../objects';
import { WitnessMessage } from './messages';

const getCurrentLao = makeCurrentLao();

function handleWitnessMessage(msg: ExtendedMessage): boolean {
  if (
    msg.messageData.object !== ObjectType.MESSAGE ||
    msg.messageData.action !== ActionType.WITNESS
  ) {
    console.warn('handleWitnessMessage was called to process an unsupported messages', msg);
    return false;
  }

  const storeState = getStore().getState();
  const lao = getCurrentLao(storeState);
  if (!lao) {
    console.warn('messages/witness was not processed: no LAO is currently active');
    return false;
  }

  const wsMsgData = msg.messageData as WitnessMessage;

  const msgId = wsMsgData.message_id;
  const ws = new WitnessSignature({
    witness: msg.sender,
    signature: wsMsgData.signature,
  });

  if (!ws.verify(msgId)) {
    console.warn(
      'Definitively ignoring witness messages because ' +
        `signature by ${ws.witness} doesn't match message ${msgId}`,
      msg,
    );
    return true;
  }

  dispatch(addMessageWitnessSignature(lao.id, msgId, ws.toState()));

  return true;
}

/**
 * Configures the WitnessHandler in a MessageRegistry.
 *
 * @param registry - The MessageRegistry where we want to add the mapping
 */
export function configure(registry: MessageRegistry) {
  registry.addHandler(ObjectType.MESSAGE, ActionType.WITNESS, handleWitnessMessage);
}
