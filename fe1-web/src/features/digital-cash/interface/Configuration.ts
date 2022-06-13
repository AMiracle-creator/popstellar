import { Reducer } from 'redux';

import { KeyPairRegistry } from 'core/keypair';
import { MessageRegistry } from 'core/network/jsonrpc/messages';
import { Hash, PublicKey } from 'core/objects';
import FeatureInterface from 'core/objects/FeatureInterface';
import { RollCallToken } from 'core/objects/RollCallToken';

import { DIGITAL_CASH_REDUCER_PATH, DigitalCashLaoReducerState } from '../reducer';
import { DigitalCashFeature } from './Feature';

export const DIGITAL_CASH_FEATURE_IDENTIFIER = 'digital-cash';

export interface DigitalCashCompositionConfiguration {
  /* objects */
  keyPairRegistry: KeyPairRegistry;
  messageRegistry: MessageRegistry;
  /* lao */

  /**
   * Returns the currently active lao. Should be used outside react components
   * @returns The current lao
   */
  getCurrentLao: () => DigitalCashFeature.Lao;

  /**
   * Returns the currently active lao id. Should be used outside react components
   * @returns The current lao or undefined if there is none.
   */
  getCurrentLaoId: () => Hash | undefined;
  useCurrentLaoId: () => Hash | undefined;

  /**
   * Gets whether the current user is organizer of the given lao
   */
  useIsLaoOrganizer: (laoId: string) => boolean;
  getLaoOrganizer: (laoId: string) => PublicKey | undefined;

  useRollCallById: (rollCallId: Hash | string) => DigitalCashFeature.RollCall | undefined;

  useRollCallsByLaoId: (laoId: string) => {
    [rollCallId: string]: DigitalCashFeature.RollCall;
  };

  useRollCallTokensByLaoId: (laoId: string) => RollCallToken[];
  useRollCallTokenByRollCallId: (laoId: string, rollCallId: string) => RollCallToken | undefined;
}

/**
 * The type of the context that is provided to react witness components
 */
export type DigitalCashReactContext = Pick<
  DigitalCashCompositionConfiguration,
  | 'useCurrentLaoId'
  | 'useIsLaoOrganizer'
  | 'useRollCallById'
  | 'useRollCallTokensByLaoId'
  | 'useRollCallTokenByRollCallId'
>;

/**
 * The interface the witness feature exposes
 */
export interface DigitalCashInterface extends FeatureInterface {
  walletItemGenerators: DigitalCashFeature.WalletItemGenerator[];
  walletScreens: DigitalCashFeature.WalletScreen[];
}

export interface DigitalCashCompositionInterface extends FeatureInterface {
  context: DigitalCashReactContext;
  reducers: {
    [DIGITAL_CASH_REDUCER_PATH]: Reducer<DigitalCashLaoReducerState>;
  };
}
