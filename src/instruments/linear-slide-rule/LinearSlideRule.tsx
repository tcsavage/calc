import { useEffect, useState } from "react";
import { encodeSharePayload } from "../../core/slide-rule/codec/base64url";
import { createKeyValueStore } from "../../shared/localStorageStore";
import type { InstrumentProps } from "../types";
import { buildShareUrl, clearSharePayload, readSharePayload } from "./adapters/location";
import { storageSessionPort } from "./adapters/sessionPort";
import { shareUrl } from "./adapters/share";
import { startAutosave } from "./state/persistence";
import { openSharedLink, resolveStartup } from "./state/startup";
import { createSlideRuleStore } from "./state/store";
import { SlideRulePage } from "./ui/SlideRulePage";

// Runs twice under StrictMode, so it must not clear the payload; the effect below does.
function boot() {
  const port = storageSessionPort(createKeyValueStore());
  const store = createSlideRuleStore(resolveStartup(readSharePayload(), port));
  return { store, port };
}

export default function LinearSlideRule({ settings, updateSettings }: InstrumentProps) {
  const [{ store, port }] = useState(boot);

  useEffect(() => {
    clearSharePayload();
    const onHashChange = () => {
      const payload = readSharePayload();
      if (payload === null) return;
      openSharedLink(store, payload);
      clearSharePayload();
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [store]);

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
    const outcome = await shareUrl(buildShareUrl(encodeSharePayload({ rule, state })));
    if (outcome === "copied") addNotice("Link copied to the clipboard.");
    if (outcome === "failed") addNotice("The link could not be shared.");
  };

  return (
    <SlideRulePage
      store={store}
      readoutVisible={settings.readoutVisible}
      onToggleReadout={() => updateSettings({ readoutVisible: !settings.readoutVisible })}
      onShare={onShare}
    />
  );
}
