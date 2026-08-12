import { createCipheriv, createDecipheriv, createHash, createHmac } from 'node:crypto';

/**
 * SAIC iSmart API encryption/decryption module.
 *
 * Protocol: AES-128-CBC with PKCS7 padding. Keys and IVs derived via MD5.
 * Ciphertext is hex-encoded. An HMAC-SHA256 verification header is required.
 *
 * Ported from saic-python-client-ng crypto.py / crypto_utils.py.
 */

function md5Hex(input: string): string {
  return createHash('md5').update(input, 'utf8').digest('hex');
}

export type NormalizedContentType = 'application/json' | 'application/x-www-form-urlencoded' | 'multipart/form-data';

export function normalizeContentType(contentType: string): NormalizedContentType {
  if (contentType.includes('x-www-form-urlencoded')) return 'application/x-www-form-urlencoded';
  if (contentType.startsWith('multipart/')) return 'multipart/form-data';
  return 'application/json';
}

export interface RequestEncryptionParams {
  requestPath: string;
  currentTs: string;
  tenantId: string;
  userToken: string;
  contentType: NormalizedContentType;
}

export interface EncryptedRequest {
  encryptedBody: string;
  verificationString: string;
}

/**
 * Derive AES key and IV for request encryption.
 *
 * key = md5(md5(requestPath + tenantId + userToken + "app") + currentTs + "1" + contentType)
 * iv  = md5(currentTs)
 */
function deriveRequestKeyIv(params: RequestEncryptionParams): { key: Buffer; iv: Buffer } {
  const { requestPath, currentTs, tenantId, userToken, contentType } = params;
  const keyPartOne = md5Hex(requestPath + tenantId + userToken + 'app');
  const key = md5Hex(keyPartOne + currentTs + '1' + contentType);
  const iv = md5Hex(currentTs);
  return { key: Buffer.from(key, 'hex'), iv: Buffer.from(iv, 'hex') };
}

/**
 * Derive AES key and IV for response decryption.
 *
 * key = md5(appSendDate + "1" + contentType)
 * iv  = md5(appSendDate)
 */
function deriveResponseKeyIv(appSendDate: string, contentType: string): { key: Buffer; iv: Buffer } {
  const key = md5Hex(appSendDate + '1' + contentType);
  const iv = md5Hex(appSendDate);
  return { key: Buffer.from(key, 'hex'), iv: Buffer.from(iv, 'hex') };
}

/**
 * Encrypt a plaintext body for a request.
 */
export function encryptRequest(plaintext: string, params: RequestEncryptionParams): EncryptedRequest {
  const { key, iv } = deriveRequestKeyIv(params);

  const cipher = createCipheriv('aes-128-cbc', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const verificationString = computeVerificationString(params, encrypted);

  return { encryptedBody: encrypted, verificationString };
}

/**
 * Decrypt a hex-encoded response body.
 */
export function decryptResponse(ciphertextHex: string, appSendDate: string, originalContentType: string): string {
  const normalized = normalizeContentType(originalContentType);
  const { key, iv } = deriveResponseKeyIv(appSendDate, normalized);

  const decipher = createDecipheriv('aes-128-cbc', key, iv);
  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Compute the APP-VERIFICATION-STRING HMAC-SHA256.
 *
 * hmac_input = requestPath + tenantId + userToken + "app"
 *            + currentTs + "1" + contentType + encryptedBody
 * hmac_key   = md5(aesKey + currentTs)
 *
 * where aesKey is the hex string (32 chars) of the AES key, not the raw bytes.
 */
export function computeVerificationString(params: RequestEncryptionParams, encryptedBody: string): string {
  const { requestPath, currentTs, tenantId, userToken, contentType } = params;

  const keyPartOne = md5Hex(requestPath + tenantId + userToken + 'app');
  const aesKeyHex = md5Hex(keyPartOne + currentTs + '1' + contentType);

  const hmacKey = md5Hex(aesKeyHex + currentTs);
  const hmacInput = requestPath + tenantId + userToken + 'app'
    + currentTs + '1' + contentType + encryptedBody;

  return createHmac('sha256', Buffer.from(hmacKey, 'utf8'))
    .update(hmacInput, 'utf8')
    .digest('hex');
}

/**
 * Encrypt request body and produce all crypto-related headers.
 * Returns null for the body if it's multipart (multipart bodies are not encrypted).
 */
export function encryptRequestEnvelope(
  body: string,
  params: RequestEncryptionParams
): EncryptedRequest {
  if (params.contentType === 'multipart/form-data') {
    const verificationString = computeVerificationString(params, '');
    return { encryptedBody: body, verificationString };
  }
  return encryptRequest(body, params);
}
