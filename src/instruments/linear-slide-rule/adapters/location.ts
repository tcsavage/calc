export const SHARE_PARAM = "s";
export const ROUTE = "/linear-slide-rule";

function hashQuery(hash: string): URLSearchParams {
  const index = hash.indexOf("?");
  return new URLSearchParams(index === -1 ? "" : hash.slice(index + 1));
}

/** The share payload in a hash route such as #/linear-slide-rule?s=..., if any. */
export function readSharePayload(location: Location = window.location): string | null {
  return hashQuery(location.hash).get(SHARE_PARAM);
}

/** Removes the payload so a refresh does not undo changes made after opening the link. */
export function clearSharePayload(
  location: Location = window.location,
  history: History = window.history,
) {
  if (readSharePayload(location) === null) return;
  const hash = location.hash;
  const path = hash.slice(0, hash.indexOf("?"));
  history.replaceState(history.state, "", `${location.pathname}${location.search}${path}`);
}

export function buildShareUrl(payload: string, location: Location = window.location): string {
  return `${location.origin}${location.pathname}#${ROUTE}?${SHARE_PARAM}=${payload}`;
}
