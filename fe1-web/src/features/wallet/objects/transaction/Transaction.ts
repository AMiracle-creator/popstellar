import { Base64UrlData, Hash, KeyPair, PopToken, PublicKey } from 'core/objects';
import STRINGS from 'resources/strings';

import { TransactionInput, TransactionInputJSON, TransactionInputState } from './TransactionInput';
import {
  TransactionOutput,
  TransactionOutputJSON,
  TransactionOutputState,
} from './TransactionOutput';
import { PostTransaction } from "../../network/messages";

export interface TransactionJSON {
  version: number;
  inputs: TransactionInputJSON[];
  outputs: TransactionOutputJSON[];
  lock_time: number;
}

export interface TransactionState {
  version: number;
  inputs: TransactionInputState[];
  outputs: TransactionOutputState[];
  lockTime: number;
  transactionId?: string;
}

/**
 * A coin transaction object
 */
export class Transaction {
  public readonly version: number;

  public readonly inputs: TransactionInput[];

  public readonly outputs: TransactionOutput[];

  public readonly lockTime: number;

  public readonly transactionId: Hash;

  constructor(obj: Partial<Transaction>) {
    if (obj === undefined || obj === null) {
      throw new Error(
        'Error encountered while creating a Transaction object: undefined/null parameters',
      );
    }
    if (obj.version === undefined) {
      throw new Error("Undefined 'version' when creating 'DigitalCashMessage'");
    }
    if (obj.inputs === undefined) {
      throw new Error("Undefined 'inputs' when creating 'Transaction'");
    }
    if (obj.outputs === undefined) {
      throw new Error("Undefined 'outputs' when creating 'Transaction'");
    }
    if (obj.lockTime === undefined) {
      throw new Error("Undefined 'lockTime' when creating 'Transaction'");
    }

    this.version = obj.version;
    this.inputs = obj.inputs;
    this.outputs = obj.outputs;
    this.lockTime = obj.lockTime;

    if (obj.transactionId === undefined) {
      this.transactionId = this.hashTransaction();
    } else {
      if (obj.transactionId.valueOf() !== this.hashTransaction().valueOf()) {
        throw new Error(
          "The computed transaction hash does not correspond to the provided one when creating 'Transaction'",
        );
      }
      this.transactionId = obj.transactionId;
    }
  }

  /**
   * Hashes the transaction to get its id
   */
  private hashTransaction = (): Hash => {
    // Recursively concatenating fields by lexicographic order of their names
    const dataInputs = this.inputs.flatMap((input) => {
      return [
        input.script.publicKey.valueOf(),
        input.script.signature.valueOf(),
        input.script.type,
        input.txOutHash.valueOf(),
        input.txOutIndex.toString(),
      ];
    });
    const dataOutputs = this.outputs.flatMap((output) => {
      return [output.script.publicKeyHash.valueOf(), output.script.type, output.value.toString()];
    });
    const data = dataInputs
      .concat([this.lockTime.toString()])
      .concat(dataOutputs)
      .concat([this.version.toString()]);

    // Hash will take care of concatenating each fields length
    return Hash.fromStringArray(...data);
  };

  /**
   * Creates a transaction
   * @param from the sender
   * @param to the receiver
   * @param currentBalance the current balance of the sender
   * @param amount the amount to send to the receiver
   * @param inputTransactions the transactions that contains the outputs to use as inputs in this transaction
   */
  public static create(
    from: PopToken,
    to: PublicKey,
    currentBalance: number,
    amount: number,
    inputTransactions: TransactionState[],
  ): Transaction {
    const fromPublicKeyHash = Hash.fromPublicKey(from.publicKey);

    const toPublicKeyHash = Hash.fromPublicKey(to);

    const outputTo = {
      value: amount,
      script: {
        type: STRINGS.script_type,
        publicKeyHash: toPublicKeyHash.valueOf(),
      },
    };

    const outputs: TransactionOutputState[] = [outputTo];

    if (currentBalance > amount) {
      // Send the rest of the value back to the owner, so that the entire balance
      // is always in only one output
      const outputFrom: TransactionOutputState = {
        value: currentBalance - amount,
        script: {
          type: STRINGS.script_type,
          publicKeyHash: fromPublicKeyHash.valueOf(),
        },
      };
      outputs.push(outputFrom);
    }

    const inputs: Omit<TransactionInputState, 'script'>[] = Transaction.getInputsInToSign(
      from.publicKey.valueOf(),
      inputTransactions,
    );
    // Now we need to define each objects because we need some string representation of everything to hash on

    // Concatenate the data to sign
    const dataString = Transaction.concatenateTxData(inputs, outputs);

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

    return Transaction.fromState({
      version: 1,
      inputs: finalInputs,
      outputs: outputs,
      lockTime: 0,
    });
  }

  /**
   * Creates a coinbase transaction
   * @param organizerKP the organizer's key pair
   * @param to the receiver of the coinbase transaction
   * @param amount the amount to send
   */
  public static createCoinbase(organizerKP: KeyPair, to: PublicKey, amount: number): Transaction {
    const toPublicKeyHash = Hash.fromPublicKey(to);

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
    const dataString = Transaction.concatenateTxData([input], outputs);

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

    return Transaction.fromState({
      version: 1,
      inputs: [finalInput],
      outputs: outputs,
      lockTime: 0,
    });
  }

  /**
   * Constructs a partial Input object from transaction messages to take as input
   * @param pk the public key of the sender
   * @param transactions the transaction messages used as inputs
   */
  private static getInputsInToSign = (
    pk: string,
    transactions: TransactionState[],
  ): Omit<TransactionInputState, 'script'>[] => {
    return transactions.flatMap((tr) =>
      tr.outputs
        .filter(
          (output) => output.script.publicKeyHash.valueOf() === Hash.fromPublicKey(pk).valueOf(),
        )
        .map((output, index) => {
          return {
            txOutHash: tr.transactionId!.valueOf(),
            txOutIndex: index,
          };
        }),
    );
  };

  /**
   * Verifies the validity of the transaction
   * by checking the transaction inputs signature
   * @param transaction the transaction to verify
   * @param organizerPublicKey the organizer's public key of the lao
   */
  public static isTransactionValid = (transaction: Transaction, organizerPublicKey: PublicKey) => {
    const isCoinbase = transaction.inputs[0].txOutHash.valueOf() === STRINGS.coinbase_hash;

    // Reconstruct data signed on
    const dataString = Transaction.concatenateTxData(
      transaction.inputs.map((input) => input.toState()),
      transaction.outputs.map((output) => output.toState()),
    );

    return !transaction.inputs.some((input) => {
      if (isCoinbase && input.script.publicKey.valueOf() !== organizerPublicKey.valueOf()) {
        return true;
      }
      return !input.script.signature.verify(
        input.script.publicKey,
        Base64UrlData.encode(dataString),
      );
    });
  };

  /**
   * Concatenates the partial inputs and the outputs in a string to sign over it by following the digital cash specification
   * @param inputs
   * @param outputs
   */
  public static concatenateTxData = (
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

  public static fromState(transactionState: TransactionState): Transaction {
    return new Transaction({
      ...transactionState,
      inputs: transactionState.inputs.map((input) => TransactionInput.fromState(input)),
      outputs: transactionState.outputs.map((output) => TransactionOutput.fromState(output)),
      transactionId: transactionState.transactionId
        ? new Hash(transactionState.transactionId)
        : undefined,
    });
  }

  public toState(): TransactionState {
    return {
      ...this,
      inputs: this.inputs.map((input) => input.toState()),
      outputs: this.outputs.map((output) => output.toState()),
      transactionId: this.transactionId.valueOf(),
    };
  }

  public static fromJSON(transactionJSON: TransactionJSON, transactionId: string) {
    return new Transaction({
      version: transactionJSON.version,
      inputs: transactionJSON.inputs.map((input) => TransactionInput.fromJSON(input)),
      outputs: transactionJSON.outputs.map((output) => TransactionOutput.fromJSON(output)),
      lockTime: transactionJSON.lock_time,
      transactionId: new Hash(transactionId),
    });
  }

  public toJSON(): TransactionJSON {
    return {
      version: this.version,
      inputs: this.inputs.map((input) => input.toJSON()),
      outputs: this.outputs.map((output) => output.toJSON()),
      lock_time: this.lockTime,
    };
  }
}
