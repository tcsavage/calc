import type { Session } from "../rule/types";
import { type DecodeResult, decodeSession, encodeSession } from "./codec";

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

/** A rule and its setting as a URL-safe string. */
export function encodeSharePayload(session: Session): string {
  return toBase64Url(JSON.stringify(encodeSession(session)));
}

export function decodeSharePayload(payload: string): DecodeResult<Session> {
  let raw: unknown;
  try {
    raw = JSON.parse(fromBase64Url(payload));
  } catch {
    return { ok: false, reason: "invalid" };
  }
  return decodeSession(raw);
}
