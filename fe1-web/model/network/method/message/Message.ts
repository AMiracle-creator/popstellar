import {
  Base64UrlData, Hash, PublicKey, Signature, WitnessSignature, WitnessSignatureState, Channel,
} from 'model/objects';
import { KeyPairStore } from 'store';
import { ProtocolError } from 'model/network/ProtocolError';
import {
  MessageData, buildMessageData, encodeMessageData,
} from './data';

/**
 * MessageState is the interface that should match JSON.stringify(Message)
 * It is used to store messages in a way compatible with the Redux store.
 */
export interface MessageState {
  data: string;

  sender: string;

  signature: string;

  message_id: string;

  witness_signatures: WitnessSignatureState[];

  channel?: Channel;
}

/**
 * Message represents the Message object in the PoP protocol
 */
export class Message {
  public readonly data: Base64UrlData;

  public readonly sender: PublicKey;

  public readonly signature: Signature;

  public readonly message_id: Hash;

  public readonly witness_signatures: WitnessSignature[];

  // ECMAScript private field, not string-ified by JSON
  readonly #messageData: MessageData;

  // Public getter that makes messageData appear public
  public get messageData() {
    return this.#messageData;
  }

  // The channel field gets assigned for all incoming messages in JsonRpcWithMessage.ts
  // In order to use it when handling the messages, such as the election result msg
  public channel?: Channel;

  constructor(msg: Partial<Message>) {
    if (!msg.data) {
      throw new ProtocolError("Undefined 'data' parameter encountered during 'Message' creation");
    }
    this.data = msg.data;
    if (!msg.sender) {
      throw new ProtocolError("Undefined 'sender' parameter encountered during 'Message' creation");
    }
    if (!msg.signature) {
      throw new ProtocolError("Undefined 'signature' parameter encountered during 'Message' creation");
    }

    if (!msg.signature.verify(msg.sender, msg.data) && !this.isElectionResultMessage()) {
      throw new ProtocolError("Invalid 'signature' parameter encountered during 'Message' creation");
    }
    if (!msg.message_id) {
      throw new ProtocolError("Undefined 'message_id' parameter encountered during 'Message' creation");
    }
    const expectedHash = Hash.fromStringArray(msg.data.toString(), msg.signature.toString());
    if (!expectedHash.equals(msg.message_id) && !this.isElectionResultMessage()) {
      console.log('Expected Hash was: ', expectedHash);

      throw new ProtocolError(`Invalid 'message_id' parameter encountered during 'Message' creation: unexpected id value \n
      received message_id was: ${msg.message_id}\n
      Expected message_id is: ${expectedHash}`);
    }
    if (!msg.witness_signatures) {
      throw new ProtocolError("Undefined 'witness_signatures' parameter encountered during 'Message' creation");
    }
    msg.witness_signatures.forEach((ws: WitnessSignature) => {
      if (msg.data === undefined || !ws.verify(msg.data)) {
        throw new ProtocolError(`Invalid 'witness_signatures' parameter encountered: invalid signature from ${ws.signature}`);
      }
    });

    if (msg.channel) {
      this.channel = msg.channel;
    }

    this.sender = msg.sender;
    this.signature = msg.signature;
    this.message_id = msg.message_id;
    this.witness_signatures = [...msg.witness_signatures];

    const jsonData = msg.data.decode();
    const dataObj = JSON.parse(jsonData);
    console.log('dataObj is: ', dataObj);
    this.#messageData = buildMessageData(dataObj as MessageData);
  }

  public static fromJson(obj: any): Message {
    return new Message({
      data: new Base64UrlData(obj.data.toString()),
      sender: new PublicKey(obj.sender.toString()),
      signature: new Signature(obj.signature.toString()),
      message_id: new Hash(obj.message_id.toString()),
      witness_signatures: obj.witness_signatures.map(
        (ws: WitnessSignatureState) => WitnessSignature.fromJson(ws),
      ),
      channel: obj.channel,
    });
  }

  /**
   * Creates a Message object from a given MessageData and signatures
   * We don't add the channel property here as we don't want to send that over the network
   *
   * @param data The MessageData to be signed and hashed
   * @param witnessSignatures The signatures of the witnesses
   *
   * ATTENTION: This may need updating as part of the Digital Wallet project -- 2021-03-03
   */
  public static fromData(data: MessageData, witnessSignatures?: WitnessSignature[]): Message {
    const encodedDataJson: Base64UrlData = encodeMessageData(data);
    const signature: Signature = KeyPairStore.getPrivateKey().sign(encodedDataJson);
    // Get current Lao - pass the channel from the Publish method down and then extract lao id
    // Get current RC - After RC is closed - Loop through all events in that lao
    //
    // WalletStore.get().then((e) => HDWallet.fromState(e).then(wallet => wallet.generateToken(laoId, RCId).then(keyPair => keyPair.privateKey)).sign(encodedDataJson));

    return new Message({
      data: encodedDataJson,
      sender: KeyPairStore.getPublicKey(),
      signature,
      message_id: Hash.fromStringArray(encodedDataJson.toString(), signature.toString()),
      witness_signatures: (witnessSignatures === undefined) ? [] : witnessSignatures,
    });
  }

  // This function disables the checks of signature and messageID for eleciton result messages
  // Because the message comes from the back-end and it can't sign the messages since it hasn't
  // access to the private key
  // This method is only a temporary solution for the demo and should be removed once a better
  // solution is found
  private isElectionResultMessage():boolean {
    if (this.data.decode().includes('"result":')) {
      return true;
    }
    return false;
  }
}
