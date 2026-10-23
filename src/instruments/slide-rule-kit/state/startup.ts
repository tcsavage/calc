import { decodeSharePayload } from "../../../core/slide-rule/codec/base64url";
import {
  type DecodeResult,
  decodeSavedRules,
  decodeSession,
} from "../../../core/slide-rule/codec/codec";
import type { RuleDefinition, Session } from "../../../core/slide-rule/rule/types";
import type { SlideRuleConfig } from "./config";
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
  wrongKind: "This link is for a different kind of slide rule.",
  invalidSession: "Your last session could not be restored.",
  storageUnavailable: "Settings will not be saved in this browser.",
  dropped: (scales: string[]) =>
    `Some scales are no longer available and were removed: ${scales.join(", ")}.`,
  trimmed: (scales: string[]) =>
    `Some scales did not fit on the disc and were removed: ${scales.join(", ")}.`,
};

type Loaded<R extends RuleDefinition> =
  | { ok: true; session: Session<R>; dropped: string[]; removed: string[] }
  | { ok: false; message: string };

const ofKind = <R extends RuleDefinition>(
  config: SlideRuleConfig<R>,
  rule: RuleDefinition,
): rule is R => rule.kind === config.kind;

function fitToRule<R extends RuleDefinition>(config: SlideRuleConfig<R>, rule: R) {
  return config.fitRule ? config.fitRule(rule) : { rule, removed: [] };
}

/** Decodes a share payload or stored session for this instrument, fitting its rule. */
function load<R extends RuleDefinition>(
  config: SlideRuleConfig<R>,
  decoded: DecodeResult<Session>,
  invalid: { invalid: string; newer: string },
): Loaded<R> {
  if (!decoded.ok) {
    return {
      ok: false,
      message: decoded.reason === "newer-version" ? invalid.newer : invalid.invalid,
    };
  }
  const { rule, state } = decoded.value;
  if (!ofKind(config, rule)) return { ok: false, message: MESSAGES.wrongKind };
  const fitted = fitToRule(config, rule);
  return {
    ok: true,
    session: { rule: fitted.rule, state },
    dropped: decoded.droppedScales,
    removed: fitted.removed,
  };
}

const SHARE_FAILURES = { invalid: MESSAGES.invalidShare, newer: MESSAGES.newerShare };

/** Picks the starting rule: a shared link, then the last session, then the default rule. */
export function resolveStartup<R extends RuleDefinition>(
  config: SlideRuleConfig<R>,
  sharePayload: string | null,
  port: SessionPort,
): InitialSession<R> {
  const notices: Notice[] = [];
  const notify = (message: string) => notices.push({ id: newId("notice"), message });
  if (!port.available) notify(MESSAGES.storageUnavailable);

  const saved =
    port.available && port.loadSaved() != null ? decodeSavedRules(port.loadSaved()) : undefined;
  const savedFits = (saved?.ok ? saved.value : [])
    .filter((rule) => ofKind(config, rule))
    .map((rule) => fitToRule(config, rule));
  const savedRules = savedFits.map((fitted) => fitted.rule);

  const accept = (session: Session<R>, dropped: string[], removed: string[]) => {
    const allDropped = [...dropped, ...(saved?.ok ? saved.droppedScales : [])];
    const allRemoved = [...removed, ...savedFits.flatMap((fitted) => fitted.removed)];
    if (allDropped.length > 0) notify(MESSAGES.dropped([...new Set(allDropped)]));
    if (allRemoved.length > 0) notify(MESSAGES.trimmed([...new Set(allRemoved)]));
    return { ...session, savedRules, notices };
  };

  if (sharePayload) {
    const shared = load(config, decodeSharePayload(sharePayload), SHARE_FAILURES);
    if (shared.ok) return accept(shared.session, shared.dropped, shared.removed);
    notify(shared.message);
  }
  const raw = port.available ? port.loadSession() : null;
  if (raw != null) {
    const session = load(config, decodeSession(raw), {
      invalid: MESSAGES.invalidSession,
      newer: MESSAGES.invalidSession,
    });
    if (session.ok) return accept(session.session, session.dropped, session.removed);
    notify(MESSAGES.invalidSession);
  }
  return accept(defaultSession(config), [], []);
}

/** Opens a shared link while the app is already running. */
export function openSharedLink<R extends RuleDefinition>(
  config: SlideRuleConfig<R>,
  store: SlideRuleStore<R>,
  payload: string,
): void {
  const shared = load(config, decodeSharePayload(payload), SHARE_FAILURES);
  const { addNotice } = store.getState();
  if (!shared.ok) {
    addNotice(shared.message);
    return;
  }
  store.setState({ rule: shared.session.rule, state: shared.session.state });
  if (shared.dropped.length > 0) addNotice(MESSAGES.dropped(shared.dropped));
  if (shared.removed.length > 0) addNotice(MESSAGES.trimmed(shared.removed));
}
