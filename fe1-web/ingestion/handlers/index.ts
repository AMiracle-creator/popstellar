import { MessageRegistry } from 'model/network/method/message/data/MessageRegistry';
import * as ChirpHandler from 'features/social/network/ChirpHandler';
import * as ReactionHandler from 'features/social/network/ReactionHandler';
import * as MeetingHandler from 'features/meeting/network/MeetingHandler';
import * as LaoHandler from './LaoHandler';
import * as RollCallHandler from './RollCallHandler';
import * as ElectionHandler from './ElectionHandler';
import * as WitnessHandler from './WitnessHandler';

type ConfigurableHandler = {
  configure: (msg: MessageRegistry) => void;
};

const handlers: Array<ConfigurableHandler> = [
  LaoHandler,
  MeetingHandler,
  RollCallHandler,
  ElectionHandler,
  WitnessHandler,
  ChirpHandler,
  ReactionHandler,
];

/**
 * Configures all handlers of the system within a MessageRegistry.
 *
 * @param registry - The MessageRegistry where we want to add the mappings
 */
export function configure(registry: MessageRegistry) {
  handlers.forEach((h: ConfigurableHandler) => h.configure(registry));
}
