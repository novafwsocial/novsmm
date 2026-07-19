import {
  createPublicKey,
  generateKeyPairSync,
  diffieHellman,
  createHash,
  createCipheriv,
  randomBytes,
  createHmac,
  sign,
  createPrivateKey,
} from "node:crypto";
import { db } from "@/lib/db";

/**
 * Web Push sender — RFC 8291 (Message Encryption) + RFC 8292 (VAPID).
 *
 * Implemented from scratch with node:crypto — no web-push library — so
 * the dependency surface stays minimal and the implementation works
 * in sandbox mode (no VAPID keys configured) without crashing.
 *
 * ── Sandbox mode ──────────────────────────────────────────────────
 * If VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT aren't set
 * in the environment, the sender logs the (encrypted) payload + target
 * endpoint to stdout instead of making the HTTP POST. Real browser
 * push services (Mozilla, Google, Apple) all require VAPID, so the
 * sandbox path is the only safe default.
 *
 * ── VAPID keys ────────────────────────────────────────────────────
 * VAPID keys are P-256 ECDSA. Generate once with:
 *   const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
 * Store the base64url-encoded raw public key + PKCS8 private key as
 * VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in the environment.
 *
 * ── RFC 8291 encryption ───────────────────────────────────────────
 * 1. Server generates ephemeral ECDH key pair (P-256).
 * 2. Shared secret = ECDH(server_private, user_p256dh).
 * 3. IKM = HKDF-Extract(salt, auth_secret || shared_secret) (RFC 5869 §2.1).
 * 4. CEK = HKDF-Expand(IKM, "Content-Encoding: aes128gcm\x00", 16).
 * 5. Nonce = HKDF-Expand(IKM, "Content-Encoding: nonce\x00", 12).
 * 6. Payload (aes128gcm) = header || ciphertext+tag.
 *    Header (RFC 8188 §2.1):
 *      salt (16 bytes) || record_size (4 bytes, big-endian) ||
 *      keyid_len (1 byte) || keyid (server_public_key, 65 bytes)
 *    record_size = 4096 (default), ciphertext padded with 0x02 then 0x00s.
 *
 * ── RFC 8292 VAPID ────────────────────────────────────────────────
 * Authorization: vapid t=<JWT>, k=<base64url(public_key)>
 * JWT header: { typ: "JWT", alg: "ES256" }
 * JWT payload: { aud: <push_origin>, exp: <now+12h>, sub: <vapid_subject> }
 * Signed with ES256 (ECDSA P-256 SHA-256).
 */

const MAX_RECORD_SIZE = 4096;

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface SendPushOptions {
  /** Payload to encrypt + send. Will be JSON-stringified. */
  payload: unknown;
  /** Per-subscription keys. */
  subscription: PushSubscriptionRecord;
  /** Optional TTL (seconds) for the push service. Defaults to 24h. */
  ttl?: number;
  /** Optional urgency: very-low | low | normal | high (RFC 8030). */
  urgency?: "very-low" | "low" | "normal" | "high";
  /** Optional topic for collapse (RFC 8030 §5.4). */
  topic?: string;
}

/**
 * Returns true if VAPID keys are configured in the environment.
 * When false, sendWebPush runs in sandbox mode.
 */
export function isVapidConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

/**
 * Send an encrypted Web Push message to a single subscription.
 *
 * Returns { ok: true, sandbox: boolean } on success or
 * { ok: false, status, error } on failure. Never throws — the caller
 * is expected to handle delivery failures by removing the subscription.
 */
export async function sendWebPush(
  opts: SendPushOptions,
): Promise<{ ok: boolean; sandbox: boolean; status?: number; error?: string }> {
  const payload = JSON.stringify(opts.payload);
  const encrypted = encryptPayload(payload, {
    p256dh: opts.subscription.p256dh,
    auth: opts.subscription.auth,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/octet-stream",
    "Content-Length": String(encrypted.length),
    "Content-Encoding": "aes128gcm",
    TTL: String(opts.ttl ?? 24 * 60 * 60),
    Urgency: opts.urgency ?? "normal",
  };
  if (opts.topic) headers["Topic"] = opts.topic;

  // VAPID JWT (RFC 8292). Skipped in sandbox mode.
  if (isVapidConfigured()) {
    try {
      const vapidAuth = buildVapidAuthorization(opts.subscription.endpoint);
      if (vapidAuth) {
        headers["Authorization"] = vapidAuth;
      }
    } catch (e) {
      console.error("[web-push] VAPID auth build failed:", e);
    }
  }

  // ── Sandbox mode ──
  // Without VAPID, real push services (Mozilla autopush, Google FCM,
  // Apple APNs) all reject with 403/401. Skip the HTTP call entirely
  // and log the (encrypted) intent so devs can verify the pipeline.
  if (!isVapidConfigured()) {
    console.log(
      `\n🔔 [WEB PUSH · sandbox] ───────────────────────────\n` +
        `  Endpoint: ${opts.subscription.endpoint}\n` +
        `  Urgency:  ${headers.Urgency} · TTL: ${headers.TTL}s\n` +
        `  Payload:  ${payload.slice(0, 200)}${payload.length > 200 ? "…" : ""}\n` +
        `  Encoded:  ${encrypted.length} bytes (aes128gcm, RFC 8188)\n` +
        `  Hint:     set VAPID_PUBLIC_KEY/PRIVATE_KEY/SUBJECT to deliver\n` +
        `  ─────────────────────────────────────────────────\n`,
    );
    return { ok: true, sandbox: true };
  }

  // ── Real delivery ──
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    const res = await fetch(opts.subscription.endpoint, {
      method: "POST",
      headers,
      body: new Uint8Array(encrypted),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok || res.status === 201) {
      return { ok: true, sandbox: false, status: res.status };
    }

    // 404 / 410 = subscription is dead; caller should remove it.
    // 429 = rate limit; caller should back off.
    let errMsg = `HTTP ${res.status} ${res.statusText}`;
    try {
      const text = await res.text();
      if (text) errMsg += `: ${text.slice(0, 200)}`;
    } catch {}
    return { ok: false, sandbox: false, status: res.status, error: errMsg };
  } catch (e: any) {
    return {
      ok: false,
      sandbox: false,
      error: e?.name === "AbortError" ? "Timeout (5s)" : e?.message ?? String(e),
    };
  }
}

/**
 * Send the same payload to every PushSubscription owned by a user.
 * Used by the notify pipeline. Each delivery is independent; failures
 * don't block the others. Dead subscriptions (404/410) are removed
 * from the DB so we don't keep retrying.
 */
export async function sendPushToUser(
  userId: string,
  payload: unknown,
): Promise<{ sent: number; failed: number; removed: number }> {
  const subs = await db.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  if (subs.length === 0) {
    return { sent: 0, failed: 0, removed: 0 };
  }

  let sent = 0;
  let failed = 0;
  let removed = 0;

  await Promise.allSettled(
    subs.map(async (s) => {
      const result = await sendWebPush({
        payload,
        subscription: { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
        urgency: "normal",
      });
      if (result.ok) {
        sent++;
      } else {
        failed++;
        // 404/410 = subscription gone. 403 = invalid VAPID (don't remove).
        if (result.status === 404 || result.status === 410) {
          try {
            await db.pushSubscription.delete({ where: { id: s.id } });
            removed++;
          } catch {}
        }
      }
    }),
  );

  return { sent, failed, removed };
}

// ──────────────────────────────────────────────────────────────────────────
// RFC 8291 message encryption
// ──────────────────────────────────────────────────────────────────────────

/**
 * Encrypt a UTF-8 payload for a Web Push subscription (RFC 8291 + 8188).
 *
 * Returns the binary aes128gcm record (header || ciphertext+tag) ready
 * to POST as the request body.
 */
function encryptPayload(
  payload: string,
  sub: { p256dh: string; auth: string },
): Buffer {
  // 1. Decode the user's ECDH public key (P-256, uncompressed, base64url).
  const userPublicKey = base64UrlToBuffer(sub.p256dh);
  // 2. Decode the user's auth secret (16 bytes, base64url).
  const authSecret = base64UrlToBuffer(sub.auth);

  // 3. Generate the server's ephemeral ECDH key pair (P-256).
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
  });

  // 4. Compute the shared secret via ECDH(server_private, user_public).
  const userEcdhKey = createPublicKey({
    key: p256RawToSpki(userPublicKey),
    format: "der",
    type: "spki",
  });
  const sharedSecret = diffieHellman({
    privateKey,
    publicKey: userEcdhKey,
  });

  // 5. Compute the IKM.
  //    IKM = HKDF-Extract(salt, auth_secret || shared_secret)
  //    where salt = 32 random bytes (RFC 8291 §3.2).
  const salt = randomBytes(16);
  // The auth secret is prepended to the shared secret per RFC 8291 §3.2:
  //   IKM = HKDF-Extract(auth_secret, ECDH_secret)
  // (RFC 5869 §2.1: HKDF-Extract(salt=auth_secret, IKM=shared_secret)).
  const ikm = hkdfExtract(authSecret, sharedSecret);

  // 6. Derive the content-encryption key (CEK) + nonce.
  //    CEK = HKDF-Expand(ikm, "Content-Encoding: aes128gcm\x00", 16)
  //    Nonce = HKDF-Expand(ikm, "Content-Encoding: nonce\x00", 12)
  //    where the info is the literal ASCII string + a 0x00 byte (RFC 8291 §3.2).
  const serverPublicKeyRaw = publicKeyToRawP256(publicKey);
  const cekInfo = Buffer.concat([
    Buffer.from("Content-Encoding: aes128gcm\x00", "utf8"),
    serverPublicKeyRaw,
    userPublicKey,
  ]);
  const nonceInfo = Buffer.concat([
    Buffer.from("Content-Encoding: nonce\x00", "utf8"),
    serverPublicKeyRaw,
    userPublicKey,
  ]);
  const cek = hkdfExpand(ikm, cekInfo, 16);
  const nonce = hkdfExpand(ikm, nonceInfo, 12);

  // 7. Pad the plaintext (RFC 8188 §2: padding = 0x02 followed by 0x00s).
  //    The plaintext is the user payload followed by a single 0x02 byte
  //    (records that exactly fill the block add 16 0x00 bytes + 0x02,
  //    but for short payloads a single 0x02 is sufficient).
  const plaintext = Buffer.concat([
    Buffer.from(payload, "utf8"),
    Buffer.from([0x02]),
  ]);

  // 8. AES-128-GCM encrypt.
  const cipher = createCipheriv("aes-128-gcm", cek, nonce, { authTagLength: 16 });
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // 9. Build the RFC 8188 record:
  //    salt (16) || rs (4 BE) || idlen (1) || keyid (server_pub_raw, 65)
  //    || ciphertext+authtag
  const header = Buffer.alloc(16 + 4 + 1 + 65);
  salt.copy(header, 0);
  header.writeUInt32BE(MAX_RECORD_SIZE, 16);
  header.writeUInt8(65, 20);
  serverPublicKeyRaw.copy(header, 21);

  return Buffer.concat([header, ciphertext, authTag]);
}

/**
 * HKDF-Extract (RFC 5869 §2.1) using HMAC-SHA256.
 * Returns 32 bytes.
 */
function hkdfExtract(salt: Buffer, ikm: Buffer): Buffer {
  return createHmac("sha256", salt).update(ikm).digest();
}

/**
 * HKDF-Expand (RFC 5869 §2.2) using HMAC-SHA256.
 * Returns `length` bytes.
 */
function hkdfExpand(prk: Buffer, info: Buffer, length: number): Buffer {
  const hashLen = 32; // SHA-256 output size
  const n = Math.ceil(length / hashLen);
  const out: Buffer[] = [];
  let prev: Buffer = Buffer.alloc(0);
  for (let i = 1; i <= n; i++) {
    const input = Buffer.concat([prev, info, Buffer.from([i])]);
    prev = createHmac("sha256", prk).update(input).digest();
    out.push(prev);
  }
  return Buffer.concat(out).subarray(0, length);
}

/**
 * Convert a raw P-256 public key (65 bytes: 0x04 || X || Y) into the
 * DER SPKI format that node:crypto's createPublicKey accepts.
 */
function p256RawToSpki(raw: Buffer): Buffer {
  // SPKI prefix for P-256 public key (uncompressed).
  // DER: 30 59 30 13 06 07 2A 86 48 CE 3D 02 01 06 08 2A 86 48 CE 3D 03 01 07 03 42 00 <65 bytes>
  const prefix = Buffer.from(
    "3059301306072a8648ce3d020106082a8648ce3d030107034200",
    "hex",
  );
  return Buffer.concat([prefix, raw]);
}

/**
 * Export a P-256 public key in raw uncompressed form (65 bytes:
 * 0x04 || X || Y). This is what the receiver uses as `keyid` in the
 * RFC 8188 record header.
 */
function publicKeyToRawP256(key: import("node:crypto").KeyObject): Buffer {
  // The JWK format is the easiest cross-version way to extract X/Y.
  const jwk = key.export({ format: "jwk" });
  const x = base64UrlToBuffer(jwk.x!);
  const y = base64UrlToBuffer(jwk.y!);
  return Buffer.concat([Buffer.from([0x04]), x, y]);
}

/**
 * Convert a base64url string to a Buffer.
 * Tolerates base64 (with padding) too — Web Push keys come in both forms.
 */
function base64UrlToBuffer(s: string): Buffer {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

// ──────────────────────────────────────────────────────────────────────────
// RFC 8292 VAPID (Voluntary Application Server Identification)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Build the Authorization header value for a VAPID-signed push request.
 * Format: `vapid t=<jwt>, k=<base64url(public_key)>`
 *
 * Returns null if VAPID env vars aren't set.
 */
function buildVapidAuthorization(endpoint: string): string | null {
  const publicKeyB64 = process.env.VAPID_PUBLIC_KEY;
  const privateKeyPem = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKeyB64 || !privateKeyPem || !subject) return null;

  const audOrigin = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12h

  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audOrigin,
    exp,
    sub: subject,
  };

  const jwtBody = `${base64UrlEncode(Buffer.from(JSON.stringify(header)))}.${base64UrlEncode(
    Buffer.from(JSON.stringify(payload)),
  )}`;

  // Load the ECDSA P-256 private key. Accept raw PKCS8 PEM or base64url
  // DER (so users can store either form in the env var).
  const keyObj = loadP256PrivateKey(privateKeyPem);
  const signature = sign(undefined, Buffer.from(jwtBody, "utf8"), keyObj);

  const jwt = `${jwtBody}.${base64UrlEncode(signature)}`;
  return `vapid t=${jwt}, k=${publicKeyB64}`;
}

function loadP256PrivateKey(pemOrB64: string): import("node:crypto").KeyObject {
  // If it looks like a PEM (starts with -----BEGIN), use it directly.
  if (pemOrB64.includes("-----BEGIN")) {
    return createPrivateKey({ key: pemOrB64, format: "pem" });
  }
  // Otherwise treat as base64url-encoded PKCS8 DER.
  const der = base64UrlToBuffer(pemOrB64);
  return createPrivateKey({ key: der, format: "der", type: "pkcs8" });
}

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Generate a fresh VAPID keypair (P-256 ECDSA).
 * Run once and store the outputs as VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY.
 * The public key is the raw 65-byte uncompressed key, base64url-encoded
 * (what the browser expects on subscribe()).
 * The private key is the PKCS8 DER, base64url-encoded (compact form).
 */
export function generateVapidKeys(): {
  publicKey: string;
  privateKey: string;
} {
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
  });
  const pubRaw = publicKeyToRawP256(publicKey);
  const privDer = privateKey.export({ format: "der", type: "pkcs8" });
  return {
    publicKey: base64UrlEncode(pubRaw),
    privateKey: base64UrlEncode(privDer),
  };
}
