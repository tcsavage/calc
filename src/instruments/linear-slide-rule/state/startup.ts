import { decodeSharePayload } from "../../../core/slide-rule/codec/base64url";
import {
  type DecodeFailure,
  decodeSavedRules,
  decodeSession,
} from "../../../core/slide-rule/codec/codec";
import type { Session } from "../../../core/slide-rule/rule/types";
import type { SessionPort } from "./ports";
import {
  defaultSession,
  type InitialSession,
  type Notice,
  newId,
  type SlideRuleStore,
} from "./store";

export const MESSAGES = {
  invalidShare: "This shared link could not be opened.",
  newerShare: "This link was made with a newer version of the app. Reload to update.",
  invalidSession: "Your last session could not be restored.",
  storageUnavailable: "Settings will not be saved in this browser.",
  dropped: (scales: string[]) =>
    `Some scales are no longer available and were removed: ${scales.join(", ")}.`,
};

/** Picks the starting rule: a shared link, then the last session, then the default rule. */
export function resolveStartup(sharePayload: string | null, port: SessionPort): InitialSession {
  const notices: Notice[] = [];
  const notify = (message: string) => notices.push({ id: newId("notice"), message });
  if (!port.available) notify(MESSAGES.storageUnavailable);

  const saved =
    port.available && port.loadSaved() != null ? decodeSavedRules(port.loadSaved()) : undefined;
  const savedRules = saved?.ok ? saved.value : [];

  const accept = (decoded: { value: Session; droppedScales: string[] }) => {
    const dropped = [...decoded.droppedScales, ...(saved?.ok ? saved.droppedScales : [])];
    if (dropped.length > 0) notify(MESSAGES.dropped([...new Set(dropped)]));
    return { ...decoded.value, savedRules, notices };
  };

  if (sharePayload) {
    const shared = decodeSharePayload(sharePayload);
    if (shared.ok) return accept(shared);
    notify(failureMessage(shared));
  }
  const raw = port.available ? port.loadSession() : null;
  if (raw != null) {
    const session = decodeSession(raw);
    if (session.ok) return accept(session);
    notify(MESSAGES.invalidSession);
  }
  return accept({ value: defaultSession(), droppedScales: [] });
}

function failureMessage(failure: DecodeFailure): string {
  return failure.reason === "newer-version" ? MESSAGES.newerShare : MESSAGES.invalidShare;
}

/** Opens a shared link while the app is already running. */
export function openSharedLink(store: SlideRuleStore, payload: string): void {
  const shared = decodeSharePayload(payload);
  const { addNotice } = store.getState();
  if (!shared.ok) {
    addNotice(failureMessage(shared));
    return;
  }
  store.setState({ rule: shared.value.rule, state: shared.value.state });
  if (shared.droppedScales.length > 0) addNotice(MESSAGES.dropped(shared.droppedScales));
}
