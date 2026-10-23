export const SHARE_PARAM = "s";

/** Splits a hash route such as #/linear-slide-rule?s=... into its path and query. */
function hashRoute(hash: string): { path: string; query: URLSearchParams } {
  const route = hash.replace(/^#/, "");
  const index = route.indexOf("?");
  if (index === -1) return { path: route, query: new URLSearchParams() };
  return { path: route.slice(0, index), query: new URLSearchParams(route.slice(index + 1)) };
}

/**
 * The share payload in the hash, if any, when the hash is on the given route. A payload on another
 * instrument's route is left alone for that instrument.
 */
export function readSharePayload(
  route: string,
  location: Location = window.location,
): string | null {
  const { path, query } = hashRoute(location.hash);
  return path === route ? query.get(SHARE_PARAM) : null;
}

/** Removes the payload so a refresh does not undo changes made after opening the link. */
export function clearSharePayload(
  route: string,
  location: Location = window.location,
  history: History = window.history,
) {
  if (readSharePayload(route, location) === null) return;
  history.replaceState(history.state, "", `${location.pathname}${location.search}#${route}`);
}

export function buildShareUrl(
  route: string,
  payload: string,
  location: Location = window.location,
): string {
  return `${location.origin}${location.pathname}#${route}?${SHARE_PARAM}=${payload}`;
}
