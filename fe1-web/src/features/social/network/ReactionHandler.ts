import { ExtendedMessage } from 'core/network/messages';
import { dispatch, getStore } from 'store';
import { ActionType, MessageRegistry, ObjectType } from 'core/network/messages';

import { Reaction } from '../objects';
import { AddReaction } from './messages/reaction';
import { addReaction } from '../reducer';
import { makeCurrentLao } from 'features/lao/reducer';

/**
 * Handler for social media chirp's reactions
 */
const getCurrentLao = makeCurrentLao();

/**
 * Handles an addReaction messages by storing the reaction sent.
 *
 * @param msg - The extended messages for adding a reaction
 */
function handleAddReactionMessage(msg: ExtendedMessage): boolean {
  if (msg.messageData.object !== ObjectType.REACTION || msg.messageData.action !== ActionType.ADD) {
    console.warn('handleAddReaction was called to process an unsupported messages');
    return false;
  }

  const makeErr = (err: string) => `reaction/add was not processed: ${err}`;

  const storeState = getStore().getState();
  const lao = getCurrentLao(storeState);
  if (!lao) {
    console.warn(makeErr('no Lao is currently active'));
    return false;
  }

  const messageId = msg.message_id;
  const { sender } = msg;
  const reactionMessage = msg.messageData as AddReaction;

  const reaction = new Reaction({
    id: messageId,
    sender: sender,
    codepoint: reactionMessage.reaction_codepoint,
    chirpId: reactionMessage.chirp_id,
    time: reactionMessage.timestamp,
  });

  dispatch(addReaction(lao.id, reaction.toState()));
  return true;
}

/**
 * Configures the ReactionHandler in a MessageRegistry.
 *
 * @param registry - The MessageRegistry where we want to add the mapping
 */
export function configure(registry: MessageRegistry) {
  registry.addHandler(ObjectType.REACTION, ActionType.ADD, handleAddReactionMessage);
}
