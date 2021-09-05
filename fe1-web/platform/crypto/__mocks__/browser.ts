import base64url from 'base64url';

const mockPrivateKey = '__MY_PRIVATE_KEY__' as unknown as CryptoKey;
const mockPublicKey = '__MY_PUBLIC_KEY__' as unknown as CryptoKey;

export const cipherMap = new Map<string, ArrayBuffer>();

export const generateKeyMock = jest.fn(
  (): Promise<CryptoKey | CryptoKeyPair> => {
    cipherMap.clear();
    return Promise.resolve({
      publicKey: mockPublicKey,
      privateKey: mockPrivateKey,
    } as CryptoKeyPair);
  });

export const encryptMock = jest.fn(
  (s: Algorithm, publicKey: CryptoKey,
   plaintext: Uint8Array | ArrayBuffer): Promise<ArrayBuffer> => {
    // TODO: verify algorithm

    // Verify key
    if (publicKey !== mockPublicKey) {
      throw Error('Expected to use public key when encrypting');
    }

    // Store ciphertext and plaintext association
    let h = base64url.encode(Buffer.from(plaintext));
    cipherMap.set(h, plaintext);
    return Promise.resolve(Buffer.from(h));
  });

export const decryptMock = jest.fn(
  (s: Algorithm, privateKey: CryptoKey,
   ciphertext: Uint8Array | ArrayBuffer): Promise<ArrayBuffer> => {
    // TODO: verify algorithm

    // Verify key
    if (privateKey !== mockPrivateKey) {
      throw Error('Expected to use private key when decrypting');
    }

    // Verify plaintext was encrypted
    let mapKey = ciphertext.toString();
    if (!cipherMap.has(mapKey)) {
      throw Error('Decrypting something that was not encrypted with this key');
    }

    let plaintext = cipherMap.get(mapKey) as ArrayBuffer;
    return Promise.resolve(plaintext);
  });

export function getSubtleCrypto(): SubtleCrypto {
  return {
    generateKey: generateKeyMock as typeof SubtleCrypto.prototype.generateKey,
    encrypt: encryptMock as typeof SubtleCrypto.prototype.encrypt,
    decrypt: decryptMock as typeof SubtleCrypto.prototype.decrypt,
  } as SubtleCrypto;
}
