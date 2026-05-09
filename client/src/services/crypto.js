// Lightweight E2EE helpers using WebCrypto: ECDH (P-256) + AES-GCM
const b64enc = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str);
};

const b64dec = (b64) => {
  const str = atob(b64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes.buffer;
};

export const generateAndStoreKeyPair = async () => {
  const kp = await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );

  const pubRaw = await window.crypto.subtle.exportKey('raw', kp.publicKey);
  const pubB64 = b64enc(pubRaw);

  const privJwk = await window.crypto.subtle.exportKey('jwk', kp.privateKey);
  localStorage.setItem('e2ee_private_jwk', JSON.stringify(privJwk));

  return pubB64;
};

export const getStoredPrivateJwk = () => {
  const raw = localStorage.getItem('e2ee_private_jwk');
  return raw ? JSON.parse(raw) : null;
};

export const deriveSharedKey = async (privateJwk, peerPublicB64) => {
  if (!privateJwk || !peerPublicB64) return null;

  const privateKey = await window.crypto.subtle.importKey(
    'jwk',
    privateJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits']
  );

  const pubRaw = b64dec(peerPublicB64);
  const publicKey = await window.crypto.subtle.importKey(
    'raw',
    pubRaw,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedBits = await window.crypto.subtle.deriveBits(
    { name: 'ECDH', public: publicKey },
    privateKey,
    256
  );

  const aesKey = await window.crypto.subtle.importKey(
    'raw',
    sharedBits,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );

  return aesKey;
};

export const encryptWithSharedKey = async (aesKey, plaintext) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(plaintext);
  const ct = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, enc);

  return JSON.stringify({ version: 1, iv: b64enc(iv.buffer), ct: b64enc(ct) });
};

export const decryptWithSharedKey = async (aesKey, envelopeStr) => {
  try {
    const env = typeof envelopeStr === 'string' ? JSON.parse(envelopeStr) : null;
    if (!env || env.version !== 1) return null;

    const iv = b64dec(env.iv);
    const ct = b64dec(env.ct);
    const ptBuf = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, aesKey, ct);
    return new TextDecoder().decode(ptBuf);
  } catch (e) {
    return null;
  }
};

export default {
  generateAndStoreKeyPair,
  getStoredPrivateJwk,
  deriveSharedKey,
  encryptWithSharedKey,
  decryptWithSharedKey,
};
