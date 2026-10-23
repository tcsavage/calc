import { useEffect, useState } from "react";
import { encodeSharePayload } from "../../../core/slide-rule/codec/base64url";
import type { RuleDefinition } from "../../../core/slide-rule/rule/types";
import { createKeyValueStore } from "../../../shared/localStorageStore";
import { buildShareUrl, clearSharePayload, readSharePayload } from "../adapters/location";
import { type StorageKeys, storageSessionPort } from "../adapters/sessionPort";
import { shareUrl } from "../adapters/share";
import type { SlideRuleConfig } from "../state/config";
import { startAutosave } from "../state/persistence";
import { openSharedLink, resolveStartup } from "../state/startup";
import { createSlideRuleStore } from "../state/store";

/** Everything the kit needs to run one slide rule instrument in the browser. */
export interface SlideRuleInstrumentConfig<R extends RuleDefinition> extends SlideRuleConfig<R> {
  /** Hash route of the instrument, such as /linear-slide-rule. */
  route: string;
  storageKeys: StorageKeys;
  shareTitle: string;
}

/** Boots the store from a shared link or storage, keeps it saved, and follows share links. */
export function useSlideRuleInstrument<R extends RuleDefinition>(
  config: SlideRuleInstrumentConfig<R>,
) {
  // Runs twice under StrictMode, so it must not clear the payload; the effect below does.
  const [{ store, port }] = useState(() => {
    const port = storageSessionPort(createKeyValueStore(), config.storageKeys);
    const store = createSlideRuleStore(
      config,
      resolveStartup(config, readSharePayload(config.route), port),
    );
    return { store, port };
  });

  useEffect(() => {
    clearSharePayload(config.route);
    const onHashChange = () => {
      const payload = readSharePayload(config.route);
      if (payload === null) return;
      openSharedLink(config, store, payload);
      clearSharePayload(config.route);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [config, store]);

  useEffect(() => {
    const autosave = startAutosave(store, port);
    window.addEventListener("pagehide", autosave.flush);
    return () => {
      window.removeEventListener("pagehide", autosave.flush);
      autosave.stop();
    };
  }, [store, port]);

  const onShare = async () => {
    const { rule, state, addNotice } = store.getState();
    const url = buildShareUrl(config.route, encodeSharePayload({ rule, state }));
    const outcome = await shareUrl(url, config.shareTitle);
    if (outcome === "copied") addNotice("Link copied to the clipboard.");
    if (outcome === "failed") addNotice("The link could not be shared.");
  };

  return { store, onShare };
}
