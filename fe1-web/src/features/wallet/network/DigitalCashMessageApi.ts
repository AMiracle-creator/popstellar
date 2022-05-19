import { publish } from 'core/network';
import { Base64UrlData, channelFromIds, Hash, KeyPair, PopToken, PublicKey } from 'core/objects';
import { Lao } from 'features/lao/objects';
import { OpenedLaoStore } from 'features/lao/store';
import STRINGS from 'resources/strings';

import {
  Transaction,
  TransactionInputState,
  TransactionOutputState, TransactionState
} from '../objects/transaction';
import { DigitalCashStore } from '../store';
import { PostTransaction } from './messages';

import getBalance = DigitalCashStore.getBalance;

const makeErr = (err: string) => `Sending the transaction failed: ${err}`;

/**
 * Requests a digital cash transaction post
 * @param from the popToken to send it with
 * @param to the destination public key
 * @param amount the value of the transaction
 */
export function requestSendTransaction(
  from: PopToken,
  to: PublicKey,
  amount: number,
): Promise<void> {
  // TODO: Should check total value, OVERFLOW

  const fromPublicKeyHash = Hash.fromString(from.publicKey.valueOf());
  const toPublicKeyHash = Hash.fromString(to.valueOf());

  const transactionStates = DigitalCashStore.getTransactionsByPublicKey(from.publicKey.valueOf());

  if (!transactionStates) {
    console.warn(makeErr('no transaction out were found for this public key'));
    return Promise.resolve();
  }

  const balance = getBalance(from.publicKey.valueOf());

  if (amount < 0 || amount > balance) {
    console.warn(makeErr('balance is not sufficient to send this amount'));
    return Promise.resolve();
  }

  const outputTo = {
    value: amount,
    script: {
      type: STRINGS.script_type,
      publicKeyHash: toPublicKeyHash.valueOf(),
    },
  };

  const outputs: TransactionOutputState[] = [outputTo];

  if (balance > amount) {
    // Send the rest of the value back to the owner, so that the entire balance
    // is always in only one TxOut
    const outputFrom: TransactionOutputState = {
      value: balance - amount,
      script: {
        type: STRINGS.script_type,
        publicKeyHash: fromPublicKeyHash.valueOf(),
      },
    };
    outputs.push(outputFrom);
  }

  const inputs: Omit<TransactionInputState, 'script'>[] = getInputsInToSign(
    from.publicKey.valueOf(),
    transactionStates,
  );
  // Now we need to define each objects because we need some string representation of everything to hash on

  // Concatenate the data to sign
  const dataString = concatenateTxData(inputs, outputs);

  // Sign with the popToken
  const signature = from.privateKey.sign(Base64UrlData.encode(dataString));

  // Reconstruct the txIns with the signature
  const finalInputs: TransactionInputState[] = inputs.map((input) => {
    return {
      ...input,
      script: {
        type: STRINGS.script_type,
        publicKey: from.publicKey.valueOf(),
        signature: signature.valueOf(),
      },
    };
  });

  const transaction: Transaction = Transaction.fromState({
    version: 1,
    inputs: finalInputs,
    outputs: outputs,
    lockTime: 0,
  });

  const postTransactionMessage = new PostTransaction({
    transaction_id: transaction.transactionId,
    transaction: transaction.toJSON(),
  });
  const lao: Lao = OpenedLaoStore.get();

  console.log(`Sending a transaction with id: ${transaction.transactionId.valueOf()}`);

  return publish(channelFromIds(lao.id), postTransactionMessage);
}

/**
 * Requests a digital cash coinbase transaction post
 *
 * @param organizerKP the keypair of the organizer
 * @param to the destination public key
 * @param amount the value of the transaction
 */
export function requestCoinbaseTransaction(
  organizerKP: KeyPair,
  to: PublicKey,
  amount: number,
): Promise<void> {
  const toPublicKeyHash = Hash.fromString(to.valueOf());

  const outputTo = {
    value: amount,
    script: {
      type: STRINGS.script_type,
      publicKeyHash: toPublicKeyHash.valueOf(),
    },
  };

  const outputs: TransactionOutputState[] = [outputTo];

  const input: Omit<TransactionInputState, 'script'> = {
    txOutHash: STRINGS.coinbase_hash,
    txOutIndex: 0,
  };

  // Concatenate the data to sign
  const dataString = concatenateTxData([input], outputs);

  // Sign with the popToken
  const signature = organizerKP.privateKey.sign(Base64UrlData.encode(dataString));

  // Reconstruct the inputs with the signature of the organizer
  const finalInput: TransactionInputState = {
    ...input,
    script: {
      type: STRINGS.script_type,
      publicKey: organizerKP.publicKey.valueOf(),
      signature: signature.valueOf(),
    },
  };

  const transaction: Transaction = Transaction.fromState({
    version: 1,
    inputs: [finalInput],
    outputs: outputs,
    lockTime: 0,
  });

  const postTransactionMessage = new PostTransaction({
    transaction_id: transaction.transactionId,
    transaction: transaction.toJSON(),
  });

  const lao: Lao = OpenedLaoStore.get();

  console.log(`Sending a coinbase transaction with id: ${transaction.transactionId.valueOf()}`);

  return publish(channelFromIds(lao.id), postTransactionMessage);
}

/**
 * Constructs a partial Input object from transaction messages to take as input
 * @param pk the public key of the sender
 * @param transactions the transaction messages used as inputs
 */
const getInputsInToSign = (
  pk: string,
  transactions: TransactionState[],
): Omit<TransactionInputState, 'script'>[] => {
  return transactions.flatMap((tr) =>
    tr.outputs
      .filter((output) => output.script.publicKeyHash.valueOf() === Hash.fromString(pk).valueOf())
      .map((output, index) => {
        return {
          txOutHash: tr.transactionId!.valueOf(),
          txOutIndex: index,
        };
      }),
  );
};

/**
 * Concatenates the partial inputs and the outputs in a string to sign over it by following the digital cash specification
 * @param inputs
 * @param outputs
 */
const concatenateTxData = (
  inputs: Omit<TransactionInputState, 'script'>[],
  outputs: TransactionOutputState[],
) => {
  const inputsDataString = inputs.reduce(
    (dataString, input) => dataString + input.txOutHash!.valueOf() + input.txOutIndex!.toString(),
    '',
  );
  return outputs.reduce(
    (dataString, output) =>
      dataString +
      output.value.toString() +
      output.script.type +
      output.script.publicKeyHash.valueOf(),
    inputsDataString,
  );
};
